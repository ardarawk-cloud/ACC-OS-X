#!/usr/bin/env bash
set -euo pipefail
command -v docker >/dev/null
command -v ffmpeg >/dev/null
BASE="bluenviron/mediamtx:1.21.3"
PUBLISHER_PID=""
docker pull "$BASE"
cleanup() {
  if [[ -n "$PUBLISHER_PID" ]]; then kill "$PUBLISHER_PID" 2>/dev/null || true; wait "$PUBLISHER_PID" 2>/dev/null || true; fi
  docker rm -f nadmo-media-test-a nadmo-media-test-b >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker run -d --name nadmo-media-test-a -p 11935:1935 -p 18888:8888 -e MTX_HLSVARIANT=mpegts "$BASE" >/dev/null
docker run -d --name nadmo-media-test-b -p 21935:1935 -p 28888:8888 -e MTX_HLSVARIANT=mpegts "$BASE" >/dev/null
sleep 5
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "testsrc2=size=320x180:rate=12" \
  -f lavfi -i "sine=frequency=440:sample_rate=44100" \
  -t 45 -c:v libx264 -preset ultrafast -tune zerolatency \
  -g 24 -pix_fmt yuv420p -b:v 250k \
  -c:a aac -b:a 64k /tmp/nadmo-source.mp4
ffmpeg -hide_banner -loglevel error -re -stream_loop -1 -i /tmp/nadmo-source.mp4 \
  -map 0:v -map 0:a -c copy \
  -f tee "[f=flv:onfail=ignore]rtmp://127.0.0.1:11935/live|[f=flv:onfail=ignore]rtmp://127.0.0.1:21935/live" \
  >/tmp/nadmo-publisher.log 2>&1 &
PUBLISHER_PID="$!"
for attempt in $(seq 1 45); do
  if curl -fsS --max-time 3 http://127.0.0.1:18888/live/index.m3u8 -o /tmp/nadmo-a.m3u8 &&
     curl -fsS --max-time 3 http://127.0.0.1:28888/live/index.m3u8 -o /tmp/nadmo-b.m3u8 &&
     grep -q 'EXTM3U' /tmp/nadmo-a.m3u8 &&
     grep -q 'EXTM3U' /tmp/nadmo-b.m3u8; then break; fi
  sleep 2
done
test -s /tmp/nadmo-a.m3u8
test -s /tmp/nadmo-b.m3u8
python3 apps/nadmo-live-broadcast/qa/verify_hls.py http://127.0.0.1:18888/live/index.m3u8
python3 apps/nadmo-live-broadcast/qa/verify_hls.py http://127.0.0.1:28888/live/index.m3u8
docker stop nadmo-media-test-a >/dev/null
sleep 4
kill -0 "$PUBLISHER_PID"
python3 apps/nadmo-live-broadcast/qa/verify_hls.py http://127.0.0.1:28888/live/index.m3u8
echo "PASS: one publishing process, two independent local MediaMTX origins, both delivered real video, backup continued after primary was stopped"
