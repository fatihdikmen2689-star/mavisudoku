import { veritabani } from '../../../../../sunucu/db.ts';
import { yorumEkle } from '../../../../../sunucu/yorum.ts';
import { OyunHatasi } from '../../../../../sunucu/oyun.ts';
import { mevcutOyuncu, kaynakKontrol, govde, hataYaniti } from '../../../../../sunucu/istek.ts';

export async function POST(istek: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    kaynakKontrol(istek);
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) throw new OyunHatasi('Bulmaca bulunamadı.', 404);
    const g = await govde<{ metin: string }>(istek);
    return Response.json(await yorumEkle(await veritabani(), await mevcutOyuncu(), id, g.metin));
  } catch (e) {
    return hataYaniti(e);
  }
}
