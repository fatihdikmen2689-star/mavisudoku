import { veritabani } from '../../../../sunucu/db.ts';
import { mevcutOyuncu, hataYaniti } from '../../../../sunucu/istek.ts';
import { bulmacaBilgisi, bulmacaSiralamasi, oyunDurumu, OyunHatasi } from '../../../../sunucu/oyun.ts';
import { yorumlar } from '../../../../sunucu/yorum.ts';

export const dynamic = 'force-dynamic';

/** Bulmaca sayfasının verisi: bilgi, sıralama, yorumlar ve oyuncunun bu bulmacadaki durumu */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) throw new OyunHatasi('Bulmaca bulunamadı.', 404);
    const db = await veritabani();
    const bilgi = await bulmacaBilgisi(db, id);
    if (!bilgi) throw new OyunHatasi('Bulmaca bulunamadı.', 404);
    const o = await mevcutOyuncu();
    const [siralama, yorumListesi, durum] = await Promise.all([bulmacaSiralamasi(db, id, o), yorumlar(db, id, o), oyunDurumu(db, o, id)]);
    return Response.json({ bilgi, siralama, yorumlar: yorumListesi, durum }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return hataYaniti(e);
  }
}
