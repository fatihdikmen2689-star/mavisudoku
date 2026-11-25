import { veritabani } from '../../../sunucu/db.ts';
import { mevcutOyuncu, hataYaniti } from '../../../sunucu/istek.ts';
import { oyuncuOzeti, gununBulmacasi, bulmacaBilgisi, bulmacaSiralamasi } from '../../../sunucu/oyun.ts';

export const dynamic = 'force-dynamic';

/** Mobil ana ekran: oyuncu, seri, seviye istatistikleri, yarım oyun, günün sudokusu ve en hızlıları */
export async function GET() {
  try {
    const db = await veritabani();
    const o = await mevcutOyuncu();
    const gid = await gununBulmacasi(db);
    const [ozet, gunluk, enHizlilar] = await Promise.all([oyuncuOzeti(db, o), bulmacaBilgisi(db, gid), bulmacaSiralamasi(db, gid, o, 5)]);
    return Response.json({
      oyuncu: o ? { tip: o.tip, ad: o.tip === 'uye' ? o.rumuz : o.ad } : null,
      ...ozet, gunluk, enHizlilar,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return hataYaniti(e);
  }
}
