#!/usr/bin/env bash
set -euo pipefail
echo "Runner PATH: $PATH"
for name in docker ffmpeg ffprobe; do
  if command -v "$name"; then echo "FOUND $name"; else echo "MISSING $name"; fi
done
if ! command -v ffmpeg >/dev/null || ! command -v ffprobe >/dev/null; then
  echo "Installing FFmpeg and FFprobe on the isolated GitHub Actions runner"
  sudo apt-get update -qq
  sudo apt-get install -y ffmpeg
fi
if ! command -v docker >/dev/null; then
  echo "::error::Docker unavailable on this runner"
  exit 1
fi
docker version

BASE="bluenviron/mediamtx:1.21.3"
PUBLISHER_PID=""
docker pull "$BASE"
cleanup() {
  if [[ -n "$PUBLISHER_PID" ]]; then kill "$PUBLISHER_PID" 2>/dev/null || true; wait "$PUBLISHER_PID" 2>/dev/null || true; fi
  docker rm -f nadmo-media-test-a nadmo-media-test-b >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker run -d --name nadmo-media-test-a -p 11935:1935 -p 18888:8888 -e MTX_HLSVARIANT=mpegts -e MTX_HLSALWAYSREMUX=true "$BASE" >/dev/null
docker run -d --name nadmo-media-test-b -p 21935:1935 -p 28888:8888 -e MTX_HLSVARIANT=mpegts -e MTX_HLSALWAYSREMUX=true "$BASE" >/dev/null
sleep 5
echo "MediaMTX container status:"
docker ps -a --filter name=nadmo-media-test --format "table {{.Names}}\t{{.Status}}"
docker logs --tail 25 nadmo-media-test-a || true
docker logs --tail 25 nadmo-media-test-b || true
# Direct synthetic live publish avoids MP4 codec-tag mismatch in the FLV muxer.
# One real-time FFmpeg publisher feeds both distinct MediaMTX ingest endpoints.
ffmpeg -hide_banner -loglevel error \
  -re -f lavfi -i "testsrc2=size=320x180:rate=12" \
  -re -f lavfi -i "sine=frequency=440:sample_rate=44100" \
  -t 120 -map 0:v -map 1:a \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -g 24 -pix_fmt yuv420p -b:v 250k \
  -c:a aac -b:a 64k \
  -f tee "[f=flv:onfail=ignore]rtmp://127.0.0.1:11935/live|[f=flv:onfail=ignore]rtmp://127.0.0.1:21935/live" \
  >/tmp/nadmo-publisher.log 2>&1 &
PUBLISHER_PID="$!"
echo "Publisher launched with PID: $PUBLISHER_PID"
sleep 4
if ! kill -0 "$PUBLISHER_PID"; then echo "::error::Publisher exited early"; cat /tmp/nadmo-publisher.log; exit 1; fi
for attempt in $(seq 1 12); do
  echo "checking HLS on both origins, attempt $attempt"
  if curl -fsSL --noproxy '*' --max-time 3 http://127.0.0.1:18888/live/index.m3u8 -o /tmp/nadmo-a.m3u8 &&
     curl -fsSL --noproxy '*' --max-time 3 http://127.0.0.1:28888/live/index.m3u8 -o /tmp/nadmo-b.m3u8 &&
     grep -q 'EXTM3U' /tmp/nadmo-a.m3u8 &&
     grep -q 'EXTM3U' /tmp/nadmo-b.m3u8; then break; fi
  sleep 2
done
echo "Playlist response sample A:"; head -c 750 /tmp/nadmo-a.m3u8 || true; echo
echo "Playlist response sample B:"; head -c 750 /tmp/nadmo-b.m3u8 || true; echo
echo "HTTP headers primary:"; curl -sSI --noproxy '*' --max-time 3 http://127.0.0.1:18888/live/index.m3u8 || true
echo "Publisher log:"; tail -50 /tmp/nadmo-publisher.log || true
echo "Primary logs:"; docker logs --tail 30 nadmo-media-test-a || true
echo "Backup logs:"; docker logs --tail 30 nadmo-media-test-b || true
test -s /tmp/nadmo-a.m3u8
test -s /tmp/nadmo-b.m3u8
python3 apps/nadmo-live-broadcast/qa/verify_hls.py http://127.0.0.1:18888/live/index.m3u8
python3 apps/nadmo-live-broadcast/qa/verify_hls.py http://127.0.0.1:28888/live/index.m3u8
# Verify the actual Durable Object routing algorithm against both live HLS origins.
# This test deliberately stops primary and requires the real backup manifest to stay valid.
node apps/nadmo-live-broadcast/qa/real-origin-router.test.mjs
sleep 4
kill -0 "$PUBLISHER_PID"
python3 apps/nadmo-live-broadcast/qa/verify_hls.py http://127.0.0.1:28888/live/index.m3u8
echo "PASS: one publishing process, two local MediaMTX origins, verified media, real controller failover, backup survives primary stop"
