#!/usr/bin/env python3
"""Fetch HLS metadata and real TS segment from a local integration-test media server."""
import sys
import urllib.parse
import urllib.request

def fetch(url):
    with urllib.request.urlopen(url, timeout=8) as resp:
        return resp.read()

def main(url):
    for level in range(4):
        playlist=fetch(url).decode("utf-8")
        if "#EXTM3U" not in playlist:
            raise AssertionError("Invalid HLS playlist")
        entries=[line.strip() for line in playlist.splitlines() if line.strip() and not line.startswith("#")]
        if not entries:
            raise AssertionError("Playlist contains no media files")
        target=urllib.parse.urljoin(url,entries[0])
        if urllib.parse.urlparse(target).path.endswith(".m3u8"):
            url=target
            continue
        chunk=fetch(target)
        if len(chunk)<1024:
            raise AssertionError("No real media payload")
        if urllib.parse.urlparse(target).path.endswith(".ts") and chunk[0]!=0x47:
            raise AssertionError("MPEG-TS payload missing sync byte")
        print("PASS: playlist and real media segment",len(chunk),"bytes",url)
        return
    raise AssertionError("Too many nested manifests")

if __name__=="__main__":
    main(sys.argv[1])
