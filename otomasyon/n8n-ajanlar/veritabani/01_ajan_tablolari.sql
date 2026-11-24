-- MaviSudoku yapay zekâ ajan sistemi: n8n'in kullandığı tablolar
-- PostgreSQL 14+ (Supabase dahil). Bir kez çalıştırılır.

-- 1) Genel ayarlar (acil durdurma anahtarı burada)
CREATE TABLE IF NOT EXISTS ayarlar (
    anahtar  TEXT PRIMARY KEY,
    deger    TEXT NOT NULL,
    guncelleme TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO ayarlar (anahtar, deger) VALUES ('sistem_aktif', 'evet')
ON CONFLICT (anahtar) DO NOTHING;

-- 2) Tüm ajanların yaptığı her işin kaydı (denetim izi)
CREATE TABLE IF NOT EXISTS ajan_islem_kaydi (
    id      BIGSERIAL PRIMARY KEY,
    zaman   TIMESTAMPTZ NOT NULL DEFAULT now(),
    ajan    TEXT NOT NULL,           -- yonetici, tasarim, sosyal_medya, icerik_seo, moderator, topluluk, analiz, video, denetci, meta_yayin
    gorev   TEXT,
    sonuc   TEXT
);

CREATE INDEX IF NOT EXISTS ajan_islem_kaydi_zaman_idx ON ajan_islem_kaydi (zaman DESC);
CREATE INDEX IF NOT EXISTS ajan_islem_kaydi_ajan_idx  ON ajan_islem_kaydi (ajan, zaman DESC);

-- 3) Yönetici Ajan'ın hafızası (yonetici_hafiza) n8n tarafından otomatik oluşturulur.

-- 4) n8n'in bağlanacağı kısıtlı veritabanı kullanıcısı
--    Ajanlar oyun tablolarına DOĞRUDAN erişmez; oyun verisine yalnızca site Admin API'si üzerinden ulaşır.
--    Şifreyi değiştirin.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'n8n_ajan') THEN
    CREATE ROLE n8n_ajan LOGIN PASSWORD 'BURAYA_GUCLU_BIR_SIFRE';
  END IF;
END $$;

GRANT SELECT, UPDATE ON ayarlar TO n8n_ajan;
GRANT SELECT, INSERT ON ajan_islem_kaydi TO n8n_ajan;
GRANT USAGE, SELECT ON SEQUENCE ajan_islem_kaydi_id_seq TO n8n_ajan;
-- Hafıza tablosunu n8n'in oluşturabilmesi için:
GRANT CREATE ON SCHEMA public TO n8n_ajan;

-- 5) 90 günden eski kayıtları temizleme (isteğe bağlı; KVKK saklama süresi için)
--    pg_cron varsa:  SELECT cron.schedule('0 4 * * *', $$DELETE FROM ajan_islem_kaydi WHERE zaman < now() - interval '90 days'$$);
