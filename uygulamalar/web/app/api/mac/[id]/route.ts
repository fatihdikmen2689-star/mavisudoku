import { veritabani } from '../../../../sunucu/db.ts';
import { macDurumu } from '../../../../sunucu/mac.ts';
import { OyunHatasi } from '../../../../sunucu/oyun.ts';
import { mevcutOyuncu, hataYaniti } from '../../../../sunucu/istek.ts';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) throw new OyunHatasi('Maç bulunamadı.', 404);
    return Response.json(await macDurumu(await veritabani(), await mevcutOyuncu(), id), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return hataYaniti(e);
  }
}
