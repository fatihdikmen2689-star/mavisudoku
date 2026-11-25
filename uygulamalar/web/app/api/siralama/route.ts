import { veritabani } from '../../../sunucu/db.ts';
import { mevcutOyuncu, hataYaniti } from '../../../sunucu/istek.ts';
import { genelSiralama, donemMi } from '../../../sunucu/siralama.ts';

export const dynamic = 'force-dynamic';

export async function GET(istek: Request) {
  try {
    const d = new URL(istek.url).searchParams.get('donem');
    const liste = await genelSiralama(await veritabani(), donemMi(d) ? d : 'hafta', await mevcutOyuncu());
    return Response.json({ liste }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return hataYaniti(e);
  }
}
