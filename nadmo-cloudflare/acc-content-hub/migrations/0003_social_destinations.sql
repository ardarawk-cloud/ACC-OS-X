-- Channel-owned destination selection; NO global LOCK, no invented account mapping.
CREATE TABLE IF NOT EXISTS social_channel_destinations (
  channel_key TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook_page','instagram')),
  target_id TEXT NOT NULL,
  label TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (channel_key,platform,target_id),
  FOREIGN KEY (channel_key) REFERENCES social_channels(channel_key)
);
CREATE INDEX IF NOT EXISTS idx_social_channel_destinations_channel
 ON social_channel_destinations(channel_key);
