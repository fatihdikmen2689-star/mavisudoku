import { veritabani } from '../../../../../sunucu/db.ts';
import { davetYanitla } from '../../../../../sunucu/mac.ts';
import { OyunHatasi } from '../../../../../sunucu/oyun.ts';
import { mevcutOyuncu, kaynakKontrol, govde, hataYaniti } from '../../../../../sunucu/istek.ts';

export async function POST(istek: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    kaynakKontrol(istek);
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) throw new OyunHatasi('Maç bulunamadı.', 404);
    const g = await govde<Record<string, unknown>>(istek).catch(() => ({} as Record<string, unknown>));
    return Response.json(await davetYanitla(await veritabani(), await mevcutOyuncu(), id, g.kabul === true));
  } catch (e) {
    return hataYaniti(e);
  }
}
