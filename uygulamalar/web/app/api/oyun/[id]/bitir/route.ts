import { veritabani } from '../../../../../sunucu/db.ts';
import { oyunBitir, OyunHatasi } from '../../../../../sunucu/oyun.ts';
import { mevcutOyuncu, kaynakKontrol, govde, hataYaniti } from '../../../../../sunucu/istek.ts';

export async function POST(istek: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    kaynakKontrol(istek);
    const oyuncu = await mevcutOyuncu();
    if (!oyuncu) throw new OyunHatasi('Oturum bulunamadı.', 401);
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) throw new OyunHatasi('Geçersiz oyun.', 404);
    const g = await govde<{ cevap: string; sure: number; hata: number; ipucu: number }>(istek);
    const db = await veritabani();
    return Response.json({ sonuc: await oyunBitir(db, oyuncu, id, g) });
  } catch (e) {
    return hataYaniti(e);
  }
}
