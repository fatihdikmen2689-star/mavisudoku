/**
 * Veritabanı bağlantısı.
 * - DATABASE_URL varsa gerçek PostgreSQL'e (pg) bağlanır (yayın, Supabase/Neon).
 * - Yoksa geliştirme için dosyaya yazan gömülü PostgreSQL (PGlite) kullanılır; kurulum gerekmez.
 * - MS_DB=bellek ise (testler) her şey bellekte tutulur.
 * İki sürücü de aynı SQL'i çalıştırır, bu yüzden kod tek bir sorgu arayüzü kullanır.
 */

import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export type Deger = string | number | boolean | null | Date;

export interface Veritabani {
  sorgu<T = Record<string, unknown>>(metin: string, parametre?: Deger[]): Promise<T[]>;
  islem<R>(fn: (tx: Veritabani) => Promise<R>): Promise<R>;
  kapat(): Promise<void>;
}

/** Depo kökünü bulur (veri/ klasörü ve şema dosyası için) */
export function depoKoku(): string {
  let d = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(/*turbopackIgnore: true*/ join(d, 'veri')) && existsSync(/*turbopackIgnore: true*/ join(d, 'paketler'))) return d;
    d = resolve(d, '..');
  }
  return process.cwd();
}

function semaYolu(): string {
  const adaylar = [
    join(process.cwd(), 'sunucu', 'sema.sql'),
    join(depoKoku(), 'uygulamalar', 'web', 'sunucu', 'sema.sql'),
  ];
  const bulunan = adaylar.find((y) => existsSync(/*turbopackIgnore: true*/ y));
  if (!bulunan) throw new Error('sema.sql bulunamadı');
  return bulunan;
}

async function pgliteAc(bellek: boolean): Promise<Veritabani> {
  const { PGlite } = await import('@electric-sql/pglite');
  let konum: string | undefined;
  if (!bellek) {
    konum = process.env.PGLITE_DIR ?? join(depoKoku(), 'veri', 'pglite');
    mkdirSync(/*turbopackIgnore: true*/ konum, { recursive: true });
  }
  const pg = konum ? new PGlite(konum) : new PGlite();
  const sar = (q: { query: typeof pg.query }): Veritabani => ({
    async sorgu<T>(metin: string, p: Deger[] = []) {
      const r = await q.query<T>(metin, p);
      return r.rows;
    },
    async islem<R>(fn: (tx: Veritabani) => Promise<R>) {
      return pg.transaction((tx) => fn(sar(tx as unknown as { query: typeof pg.query })));
    },
    async kapat() {
      await pg.close();
    },
  });
  return sar(pg);
}

async function postgresAc(url: string): Promise<Veritabani> {
  const { Pool } = (await import('pg')).default;
  const havuz = new Pool({ connectionString: url, max: 10, ssl: url.includes('sslmode=disable') ? false : { rejectUnauthorized: false } });
  const istemciyle = (c: { query: (m: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }): Veritabani => ({
    async sorgu<T>(metin: string, p: Deger[] = []) {
      return (await c.query(metin, p)).rows as T[];
    },
    async islem<R>(fn: (tx: Veritabani) => Promise<R>) {
      const baglanti = await havuz.connect();
      try {
        await baglanti.query('BEGIN');
        const sonuc = await fn(istemciyle(baglanti));
        await baglanti.query('COMMIT');
        return sonuc;
      } catch (e) {
        await baglanti.query('ROLLBACK');
        throw e;
      } finally {
        baglanti.release();
      }
    },
    async kapat() {
      await havuz.end();
    },
  });
  return istemciyle(havuz);
}

/** Şemayı uygular ve bulmaca tablosu boşsa havuz dosyasını yükler */
async function hazirla(db: Veritabani): Promise<void> {
  const sema = readFileSync(/*turbopackIgnore: true*/ semaYolu(), 'utf8');
  for (const ifade of sema.split(/;\s*\n/).map((s) => s.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean)) {
    await db.sorgu(ifade);
  }
  const [{ sayi }] = await db.sorgu<{ sayi: number }>('SELECT count(*)::int AS sayi FROM bulmacalar');
  if (sayi === 0) {
    const yol = process.env.HAVUZ_YOLU ?? join(depoKoku(), 'veri', 'havuz.json');
    if (existsSync(/*turbopackIgnore: true*/ yol)) await havuzYukle(db, JSON.parse(readFileSync(/*turbopackIgnore: true*/ yol, 'utf8')).havuz);
  }
}

export interface HavuzKaydi { tohum: number; bulmaca: string; cozum: string; ipucu: number }

export async function havuzYukle(db: Veritabani, havuz: Record<string, HavuzKaydi[]>): Promise<number> {
  let eklenen = 0;
  for (const [seviye, liste] of Object.entries(havuz)) {
    for (const b of liste) {
      const r = await db.sorgu(
        `INSERT INTO bulmacalar (seviye, bulmaca, cozum, ipucu, tohum) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (bulmaca) DO NOTHING RETURNING id`,
        [seviye, b.bulmaca, b.cozum, b.ipucu, b.tohum],
      );
      eklenen += r.length;
    }
  }
  return eklenen;
}

const kuresel = globalThis as unknown as { __msDb?: Promise<Veritabani> };

/** Uygulama boyunca tek bağlantı (Next.js geliştirme modunda yeniden yüklemelerde de korunur) */
export function veritabani(): Promise<Veritabani> {
  if (!kuresel.__msDb) {
    kuresel.__msDb = (async () => {
      const url = process.env.DATABASE_URL;
      const db = url ? await postgresAc(url) : await pgliteAc(process.env.MS_DB === 'bellek');
      await hazirla(db);
      return db;
    })();
    kuresel.__msDb.catch(() => { kuresel.__msDb = undefined; });
  }
  return kuresel.__msDb;
}

/** Testler için: bağlantıyı kapatıp sıfırlar */
export async function veritabaniSifirla(): Promise<void> {
  if (kuresel.__msDb) {
    const db = await kuresel.__msDb;
    kuresel.__msDb = undefined;
    await db.kapat();
  }
}
