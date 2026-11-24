/**
 * Arkadaşınla oyna: iki üye aynı bulmacayı aynı anda kendi ekranında çözer.
 * - Yalnızca üyeler; davet rumuzla gönderilir, 10 dakika geçerlidir.
 * - Kabul edilince ikisinin de daha önce açmadığı bir bulmaca seçilir ve 5 saniyelik geri sayımla başlar.
 * - Her oyuncunun oyunu normal oyun kaydıdır: çözüm sunucuda doğrulanır, bulmacanın sıralamasına girer.
 * - Çözümü sunucuya ilk ulaşan kazanır. Maç 60 dakika sonra kendiliğinden kapanır.
 */
import type { SeviyeId } from '@mavisudoku/motor';
import type { Veritabani } from './db.ts';
import type { Oyuncu } from './kimlik.ts';
import { OyunHatasi, seviyeMi, havuzaBulmacaEkle, bugun } from './oyun.ts';

export const DAVET_DAKIKA = 10;
export const GERI_SAYIM_SANIYE = 5;
export const MAC_DAKIKA = 60;
const SAATLIK_DAVET = 20;
const GUNLUK_RET = 3;

type Uye = Extract<Oyuncu, { tip: 'uye' }>;

function uyeGerekli(o: Oyuncu | null): Uye {
  if (!o || o.tip !== 'uye') throw new OyunHatasi('Arkadaşınla oynamak için giriş yapmalısın.', 401);
  return o;
}

/** Süresi geçen davetleri kapatır (her davet işleminden önce çağrılır) */
async function suresiGecenleriKapat(db: Veritabani): Promise<void> {
  await db.sorgu(`UPDATE maclar SET durum = 'suresi-doldu' WHERE durum = 'bekliyor' AND olusturma < now() - make_interval(mins => $1)`, [DAVET_DAKIKA]);
}

export async function davetGonder(db: Veritabani, o: Oyuncu | null, rakipRumuz: unknown, seviye: unknown): Promise<{ macId: number }> {
  const ben = uyeGerekli(o);
  if (!seviyeMi(seviye)) throw new OyunHatasi('Geçersiz seviye.');
  const rumuz = String(rakipRumuz ?? '').trim().toLowerCase().replace(/^@/, '');
  if (!rumuz) throw new OyunHatasi('Arkadaşının rumuzunu yaz.');
  const r = await db.sorgu<{ id: number }>(`SELECT id FROM kullanicilar WHERE rumuz = $1`, [rumuz]);
  if (!r.length) throw new OyunHatasi('Bu rumuzla bir üye bulunamadı.', 404);
  const rakip = r[0].id;
  if (rakip === ben.id) throw new OyunHatasi('Kendini davet edemezsin.');
  await suresiGecenleriKapat(db);
  const [{ n }] = await db.sorgu<{ n: number }>(
    `SELECT count(*)::int AS n FROM maclar WHERE davet_eden = $1 AND olusturma > now() - interval '1 hour'`, [ben.id]);
  if (n >= SAATLIK_DAVET) throw new OyunHatasi('Çok fazla davet gönderdin. Biraz sonra tekrar dene.', 429);
  const [{ ret }] = await db.sorgu<{ ret: number }>(
    `SELECT count(*)::int AS ret FROM maclar WHERE davet_eden = $1 AND davet_edilen = $2 AND durum = 'reddedildi' AND olusturma > now() - interval '1 day'`,
    [ben.id, rakip]);
  if (ret >= GUNLUK_RET) throw new OyunHatasi('Bu oyuncu davetlerini kabul etmedi. Yarın tekrar deneyebilirsin.', 429);
  const eklenen = await db.sorgu<{ id: number }>(
    `INSERT INTO maclar (davet_eden, davet_edilen, seviye) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id`, [ben.id, rakip, seviye]);
  if (!eklenen.length) throw new OyunHatasi('Bu oyuncuyla aranızda zaten bekleyen bir davet var.', 409);
  return { macId: eklenen[0].id };
}

export async function davetIptal(db: Veritabani, o: Oyuncu | null, macId: number): Promise<void> {
  const ben = uyeGerekli(o);
  const r = await db.sorgu(`UPDATE maclar SET durum = 'iptal', yanit = now() WHERE id = $1 AND davet_eden = $2 AND durum = 'bekliyor' RETURNING id`, [macId, ben.id]);
  if (!r.length) throw new OyunHatasi('Bu davet artık iptal edilemez.', 409);
}

/** Daveti yanıtlar. Kabul edilirse bulmaca seçilir ve iki oyuncunun oyunu aynı başlangıç anıyla açılır. */
export async function davetYanitla(db: Veritabani, o: Oyuncu | null, macId: number, kabul: boolean): Promise<{ macId: number; basladi: boolean }> {
  const ben = uyeGerekli(o);
  await suresiGecenleriKapat(db);
  if (!kabul) {
    const r = await db.sorgu(`UPDATE maclar SET durum = 'reddedildi', yanit = now() WHERE id = $1 AND davet_edilen = $2 AND durum = 'bekliyor' RETURNING id`, [macId, ben.id]);
    if (!r.length) throw new OyunHatasi('Bu davet artık geçerli değil.', 409);
    return { macId, basladi: false };
  }
  const m = await db.sorgu<{ davet_eden: number; seviye: string }>(
    `SELECT davet_eden, seviye FROM maclar WHERE id = $1 AND davet_edilen = $2 AND durum = 'bekliyor'`, [macId, ben.id]);
  if (!m.length) throw new OyunHatasi('Bu davet artık geçerli değil.', 409);
  const { davet_eden: rakip } = m[0];
  const seviye = m[0].seviye as SeviyeId;

  // İkisinin de daha önce açmadığı, ileriki günlerin günlük bulmacası olmayan bir bulmaca
  const bulmacaSec = () => db.sorgu<{ id: number }>(
    `SELECT b.id FROM bulmacalar b
     WHERE b.seviye = $1
       AND NOT EXISTS (SELECT 1 FROM oyunlar o WHERE o.bulmaca_id = b.id AND o.kullanici_id IN ($2, $3))
       AND NOT EXISTS (SELECT 1 FROM gunluk g WHERE g.bulmaca_id = b.id AND g.tarih >= $4::date)
     ORDER BY b.oynanma DESC, b.id LIMIT 1`, [seviye, ben.id, rakip, bugun()]);
  let aday = await bulmacaSec();
  for (let i = 0; !aday.length && i < 3; i++) { await havuzaBulmacaEkle(db, seviye); aday = await bulmacaSec(); }
  if (!aday.length) throw new OyunHatasi('Şu an bulmaca hazırlanamadı, birazdan tekrar dene.', 503);
  const bulmacaId = aday[0].id;

  await db.islem(async (tx) => {
    const alindi = await tx.sorgu(
      `UPDATE maclar SET durum = 'basladi', yanit = now(), bulmaca_id = $2, baslangic = now() + make_interval(secs => $3)
       WHERE id = $1 AND durum = 'bekliyor' RETURNING id`, [macId, bulmacaId, GERI_SAYIM_SANIYE]);
    if (!alindi.length) throw new OyunHatasi('Bu davet artık geçerli değil.', 409);
    const acilan = await tx.sorgu(
      `INSERT INTO oyunlar (bulmaca_id, kullanici_id, baslangic)
       SELECT $1, k, (SELECT baslangic FROM maclar WHERE id = $4) FROM unnest(ARRAY[$2::int, $3::int]) AS k
       ON CONFLICT DO NOTHING RETURNING id`, [bulmacaId, ben.id, rakip, macId]);
    if (acilan.length !== 2) throw new OyunHatasi('Bulmaca bu sırada açıldı, daveti tekrar kabul et.', 409);
    await tx.sorgu(`UPDATE bulmacalar SET oynanma = oynanma + 2 WHERE id = $1`, [bulmacaId]);
    await tx.sorgu(`INSERT INTO mac_ilerleme (mac_id, kullanici_id) VALUES ($1, $2), ($1, $3)`, [macId, ben.id, rakip]);
  });
  return { macId, basladi: true };
}

export interface MacTarafi { rumuz: string; dogru: number; hata: number; bitti: boolean; sure: number | null; puan: number | null }
export type MacSonucu = 'kazandin' | 'kaybettin' | 'zaman-asimi' | null;

export interface MacDurumu {
  id: number;
  durum: 'bekliyor' | 'reddedildi' | 'iptal' | 'suresi-doldu' | 'basladi';
  davetEdenBenim: boolean;
  seviye: SeviyeId;
  bulmacaId: number | null;
  /** Başlamaya kalan milisaniye (eksi değer: başlayalı geçen süre) */
  baslamayaKalanMs: number | null;
  bosHucre: number;
  ben: MacTarafi;
  rakip: MacTarafi;
  sonuc: MacSonucu;
  bitti: boolean;
}

interface MacSatiri {
  id: number; davet_eden: number; davet_edilen: number; seviye: string; durum: MacDurumu['durum'];
  bulmaca_id: number | null; kalan_ms: number | null; olusturma: Date; eden_rumuz: string; edilen_rumuz: string; bos: number | null;
}

const MAC_SEC = `SELECT m.id, m.davet_eden, m.davet_edilen, m.seviye, m.durum, m.bulmaca_id, m.olusturma,
  CASE WHEN m.baslangic IS NULL THEN NULL ELSE (extract(epoch FROM m.baslangic - now()) * 1000)::int END AS kalan_ms,
  ke.rumuz AS eden_rumuz, kd.rumuz AS edilen_rumuz,
  (SELECT length(b.bulmaca) - length(replace(b.bulmaca, '0', '')) FROM bulmacalar b WHERE b.id = m.bulmaca_id)::int AS bos
  FROM maclar m JOIN kullanicilar ke ON ke.id = m.davet_eden JOIN kullanicilar kd ON kd.id = m.davet_edilen`;

async function tarafOku(db: Veritabani, m: MacSatiri, kullanici: number, rumuz: string): Promise<MacTarafi & { bitis: number | null }> {
  if (m.durum !== 'basladi' || !m.bulmaca_id) return { rumuz, dogru: 0, hata: 0, bitti: false, sure: null, puan: null, bitis: null };
  const [o] = await db.sorgu<{ bitis_ms: number | null; sure: number | null; puan: number | null; hata: number | null }>(
    `SELECT (extract(epoch FROM bitis) * 1000)::float8 AS bitis_ms, sure, puan, hata FROM oyunlar WHERE bulmaca_id = $1 AND kullanici_id = $2`,
    [m.bulmaca_id, kullanici]);
  const [i] = await db.sorgu<{ dogru: number; hata: number }>(`SELECT dogru, hata FROM mac_ilerleme WHERE mac_id = $1 AND kullanici_id = $2`, [m.id, kullanici]);
  const bitti = o?.bitis_ms != null;
  return {
    rumuz, bitti,
    dogru: bitti ? (m.bos ?? 0) : (i?.dogru ?? 0),
    hata: bitti ? (o.hata ?? 0) : (i?.hata ?? 0),
    sure: bitti ? o.sure : null, puan: bitti ? o.puan : null,
    bitis: o?.bitis_ms ?? null,
  };
}

export async function macDurumu(db: Veritabani, o: Oyuncu | null, macId: number): Promise<MacDurumu> {
  const ben = uyeGerekli(o);
  await suresiGecenleriKapat(db);
  const r = await db.sorgu<MacSatiri>(`${MAC_SEC} WHERE m.id = $1 AND $2 IN (m.davet_eden, m.davet_edilen)`, [macId, ben.id]);
  if (!r.length) throw new OyunHatasi('Maç bulunamadı.', 404);
  const m = r[0];
  const edenBen = m.davet_eden === ben.id;
  const [b, k] = await Promise.all([
    tarafOku(db, m, ben.id, edenBen ? m.eden_rumuz : m.edilen_rumuz),
    tarafOku(db, m, edenBen ? m.davet_edilen : m.davet_eden, edenBen ? m.edilen_rumuz : m.eden_rumuz),
  ]);
  const zamanAsimi = m.kalan_ms !== null && -m.kalan_ms > MAC_DAKIKA * 60_000;
  let sonuc: MacSonucu = null;
  if (b.bitis !== null && (k.bitis === null || b.bitis <= k.bitis)) sonuc = 'kazandin';
  else if (k.bitis !== null) sonuc = 'kaybettin';
  else if (zamanAsimi) sonuc = 'zaman-asimi';
  const { bitis: _b, ...benT } = b;
  const { bitis: _k, ...rakipT } = k;
  return {
    id: m.id, durum: m.durum, davetEdenBenim: edenBen, seviye: m.seviye as SeviyeId, bulmacaId: m.bulmaca_id,
    baslamayaKalanMs: m.kalan_ms, bosHucre: m.bos ?? 0, ben: benT, rakip: rakipT, sonuc,
    bitti: m.durum !== 'basladi' ? m.durum !== 'bekliyor' : (b.bitti && k.bitti) || zamanAsimi,
  };
}

/** Oyuncunun anlık ilerlemesi (rakibin ekranında çubuk olarak görünür; yalnızca gösterim içindir) */
export async function ilerlemeBildir(db: Veritabani, o: Oyuncu | null, macId: number, dogru: unknown, hata: unknown): Promise<void> {
  const ben = uyeGerekli(o);
  const sinirla = (v: unknown, enCok: number) => Math.min(enCok, Math.max(0, Math.floor(Number(v) || 0)));
  await db.sorgu(
    `UPDATE mac_ilerleme mi SET dogru = $3, hata = $4, guncelleme = now()
     FROM maclar m WHERE mi.mac_id = m.id AND m.id = $1 AND mi.kullanici_id = $2 AND m.durum = 'basladi'`,
    [macId, ben.id, sinirla(dogru, 81), sinirla(hata, 999)]);
}

export interface DavetSatiri { macId: number; rumuz: string; seviye: SeviyeId; kalanSaniye: number }
export interface MacOzeti { macId: number; rakip: string; seviye: SeviyeId; tarih: string; sonuc: MacSonucu | 'devam' }
export interface MacListesi { gelen: DavetSatiri[]; giden: DavetSatiri[]; maclar: MacOzeti[] }

export async function macListesi(db: Veritabani, o: Oyuncu | null): Promise<MacListesi> {
  const ben = uyeGerekli(o);
  await suresiGecenleriKapat(db);
  const bekleyen = await db.sorgu<MacSatiri>(
    `${MAC_SEC} WHERE m.durum = 'bekliyor' AND $1 IN (m.davet_eden, m.davet_edilen) ORDER BY m.olusturma DESC`, [ben.id]);
  const kalan = (m: MacSatiri) => Math.max(0, Math.round(DAVET_DAKIKA * 60 - (Date.now() - new Date(m.olusturma).getTime()) / 1000));
  const gelen = bekleyen.filter((m) => m.davet_edilen === ben.id).map((m) => ({ macId: m.id, rumuz: m.eden_rumuz, seviye: m.seviye as SeviyeId, kalanSaniye: kalan(m) }));
  const giden = bekleyen.filter((m) => m.davet_eden === ben.id).map((m) => ({ macId: m.id, rumuz: m.edilen_rumuz, seviye: m.seviye as SeviyeId, kalanSaniye: kalan(m) }));
  const son = await db.sorgu<{ id: number; yanit: Date }>(
    `SELECT id, yanit FROM maclar WHERE durum = 'basladi' AND $1 IN (davet_eden, davet_edilen) ORDER BY yanit DESC LIMIT 10`, [ben.id]);
  const maclar = await Promise.all(son.map(async (s) => {
    const d = await macDurumu(db, ben, s.id);
    return { macId: s.id, rakip: d.rakip.rumuz, seviye: d.seviye, tarih: new Date(s.yanit).toISOString(), sonuc: d.bitti || d.sonuc ? d.sonuc : 'devam' as const };
  }));
  return { gelen, giden, maclar };
}

/** Üst menüdeki rozet için bekleyen gelen davet sayısı */
export async function bekleyenDavetSayisi(db: Veritabani, o: Oyuncu | null): Promise<number> {
  if (!o || o.tip !== 'uye') return 0;
  const [{ n }] = await db.sorgu<{ n: number }>(
    `SELECT count(*)::int AS n FROM maclar WHERE davet_edilen = $1 AND durum = 'bekliyor' AND olusturma > now() - make_interval(mins => $2)`,
    [o.id, DAVET_DAKIKA]);
  return n;
}
