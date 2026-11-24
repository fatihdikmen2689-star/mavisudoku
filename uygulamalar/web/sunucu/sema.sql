-- MaviSudoku veritabanı şeması (PostgreSQL 14+; geliştirmede PGlite ile aynı SQL)
-- Her başlangıçta güvenle yeniden çalıştırılabilir.

CREATE TABLE IF NOT EXISTS kullanicilar (
  id            SERIAL PRIMARY KEY,
  eposta        TEXT NOT NULL UNIQUE,
  sifre_ozet    TEXT NOT NULL,
  ad            TEXT NOT NULL,
  soyad         TEXT NOT NULL,
  rumuz         TEXT NOT NULL UNIQUE,
  dogum_yili    INTEGER NOT NULL,
  gorunen       TEXT NOT NULL DEFAULT 'rumuz' CHECK (gorunen IN ('rumuz', 'adsoyad')),
  yas_goster    BOOLEAN NOT NULL DEFAULT FALSE,
  pazarlama     BOOLEAN NOT NULL DEFAULT FALSE,
  kvkk_onay     TIMESTAMPTZ NOT NULL,
  olusturma     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oturumlar (
  token_ozet    TEXT PRIMARY KEY,
  kullanici_id  INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  olusturma     TIMESTAMPTZ NOT NULL DEFAULT now(),
  bitis         TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS misafirler (
  id            SERIAL PRIMARY KEY,
  token_ozet    TEXT NOT NULL UNIQUE,
  ad            TEXT NOT NULL UNIQUE,
  ip_ozet       TEXT,
  aktarilan_kullanici INTEGER REFERENCES kullanicilar(id) ON DELETE SET NULL,
  olusturma     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS misafirler_ip_gun ON misafirler (ip_ozet, olusturma);

CREATE TABLE IF NOT EXISTS bulmacalar (
  id            SERIAL PRIMARY KEY,
  seviye        TEXT NOT NULL,
  bulmaca       TEXT NOT NULL UNIQUE,
  cozum         TEXT NOT NULL,
  ipucu         INTEGER NOT NULL,
  tohum         BIGINT,
  oynanma       INTEGER NOT NULL DEFAULT 0,
  cozulme       INTEGER NOT NULL DEFAULT 0,
  olusturma     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bulmacalar_seviye ON bulmacalar (seviye, oynanma DESC, id);

-- Bir oyuncu (üye ya da misafir) bir bulmacayı yalnızca bir kez oynar.
CREATE TABLE IF NOT EXISTS oyunlar (
  id            BIGSERIAL PRIMARY KEY,
  bulmaca_id    INTEGER NOT NULL REFERENCES bulmacalar(id),
  kullanici_id  INTEGER REFERENCES kullanicilar(id) ON DELETE CASCADE,
  misafir_id    INTEGER REFERENCES misafirler(id) ON DELETE CASCADE,
  baslangic     TIMESTAMPTZ NOT NULL DEFAULT now(),
  bitis         TIMESTAMPTZ,
  sure          INTEGER,
  hata          INTEGER,
  ipucu         INTEGER,
  puan          INTEGER,
  siralamada    BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK ((kullanici_id IS NULL) <> (misafir_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS oyunlar_uye_tek ON oyunlar (bulmaca_id, kullanici_id) WHERE kullanici_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS oyunlar_misafir_tek ON oyunlar (bulmaca_id, misafir_id) WHERE misafir_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS oyunlar_siralama ON oyunlar (bulmaca_id, puan DESC, sure) WHERE siralamada;
CREATE INDEX IF NOT EXISTS oyunlar_uye ON oyunlar (kullanici_id, bitis);
CREATE INDEX IF NOT EXISTS oyunlar_misafir ON oyunlar (misafir_id, bitis);

CREATE TABLE IF NOT EXISTS yorumlar (
  id            SERIAL PRIMARY KEY,
  bulmaca_id    INTEGER NOT NULL REFERENCES bulmacalar(id),
  kullanici_id  INTEGER NOT NULL REFERENCES kullanicilar(id) ON DELETE CASCADE,
  metin         TEXT NOT NULL,
  durum         TEXT NOT NULL DEFAULT 'yayinda' CHECK (durum IN ('yayinda', 'onay-bekliyor', 'gizli')),
  begeni        INTEGER NOT NULL DEFAULT 0,
  olusturma     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS yorumlar_bulmaca ON yorumlar (bulmaca_id, olusturma DESC);

CREATE TABLE IF NOT EXISTS gunluk (
  tarih         DATE PRIMARY KEY,
  bulmaca_id    INTEGER NOT NULL UNIQUE REFERENCES bulmacalar(id)
);
