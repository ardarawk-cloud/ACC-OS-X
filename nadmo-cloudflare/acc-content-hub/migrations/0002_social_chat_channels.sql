-- NADMO SOCIAL chat-to-queue: stable channel registry shared by authenticated ChatGPT/Cloudflare flow.
-- Content itself remains in private Cloudflare D1, never public GitHub issues or commits.
CREATE TABLE IF NOT EXISTS social_channels (
  channel_key TEXT PRIMARY KEY,
  channel_name TEXT NOT NULL,
  category TEXT NOT NULL,
  target_account TEXT NOT NULL DEFAULT 'TIKTOK_SHARED_01' CHECK(target_account='TIKTOK_SHARED_01'),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
INSERT OR IGNORE INTO social_channels(channel_key,channel_name,category,target_account,active) VALUES
('aku-cinta-malam','Aku Cinta Malam','nightlife','TIKTOK_SHARED_01',1),
('arda-gaming-hok','ARDA GAMING HOK','gaming','TIKTOK_SHARED_01',1),
('ardmrn-cinematix','ARDMRN Cinematix','entertainment','TIKTOK_SHARED_01',1),
('ardmrn-gaming','ARDMRN Gaming','gaming','TIKTOK_SHARED_01',1),
('ardmrn-insight','ARDMRN Insight','editorial','TIKTOK_SHARED_01',1),
('ark-garage','ARK Garage','lifestyle','TIKTOK_SHARED_01',1),
('bali-wedding-dj','Bali Wedding DJ','business','TIKTOK_SHARED_01',1),
('balinightlife','BALINIGHTLIFE','nightlife','TIKTOK_SHARED_01',1),
('berita-terkini','Berita Terkini','editorial','TIKTOK_SHARED_01',1),
('distorsi-sejarah-punk','Distorsi Sejarah Punk','history','TIKTOK_SHARED_01',1),
('dunia-bintang','Dunia Bintang','gaming','TIKTOK_SHARED_01',1),
('hikayat-pohon-ganja','Hikayat Pohon Ganja','editorial','TIKTOK_SHARED_01',1),
('jejak-nusantara','Jejak Nusantara','history','TIKTOK_SHARED_01',1),
('konten-islami','Konten Islami','culture','TIKTOK_SHARED_01',1),
('lentera-weton','Lentera Weton','culture','TIKTOK_SHARED_01',1),
('motocamp-id','Motocamp ID','lifestyle','TIKTOK_SHARED_01',1),
('mr-laziz','Mr Laziz','business','TIKTOK_SHARED_01',1),
('nadya-gaming','Nadya Gaming','gaming','TIKTOK_SHARED_01',1),
('planet-fauna','Planet Fauna','education','TIKTOK_SHARED_01',1),
('putri-ayah','Putri Ayah','family','TIKTOK_SHARED_01',1),
('ruang-dj','Ruang DJ','entertainment','TIKTOK_SHARED_01',1),
('semesta-berbisik','Semesta Berbisik','lifestyle','TIKTOK_SHARED_01',1),
('serigala-senja','Serigala Senja','entertainment','TIKTOK_SHARED_01',1),
('techverse','TechVerse','technology','TIKTOK_SHARED_01',1),
('titik-tanya','Titik Tanya','editorial','TIKTOK_SHARED_01',1),
('tukang-tambang','Tukang Tambang','technology','TIKTOK_SHARED_01',1),
('warisan-bali','Warisan Bali','culture','TIKTOK_SHARED_01',1),
('yolo','YOLO','lifestyle','TIKTOK_SHARED_01',1),
('arda-comics','Arda Comics / AM STUDIO','entertainment','TIKTOK_SHARED_01',1),
('nadmo-studio','NADMO Studio','business','TIKTOK_SHARED_01',1),
('distorsi-rakyat','DISTORSI RAKYAT','editorial','TIKTOK_SHARED_01',1);
CREATE INDEX IF NOT EXISTS idx_social_channels_active ON social_channels(active);
