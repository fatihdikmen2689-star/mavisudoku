import { veritabani } from '../../../sunucu/db.ts';
import { davetGonder, macListesi } from '../../../sunucu/mac.ts';
import { mevcutOyuncu, kaynakKontrol, govde, hataYaniti } from '../../../sunucu/istek.ts';

export const dynamic = 'force-dynamic';

/** Gelen/giden davetler ve son maçlar */
export async function GET() {
  try {
    return Response.json(await macListesi(await veritabani(), await mevcutOyuncu()), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return hataYaniti(e);
  }
}

/** Davet gönder: { rakip: rumuz, seviye } */
export async function POST(istek: Request) {
  try {
    kaynakKontrol(istek);
    const g = await govde<{ rakip: string; seviye: string }>(istek);
    return Response.json(await davetGonder(await veritabani(), await mevcutOyuncu(), g.rakip, g.seviye));
  } catch (e) {
    return hataYaniti(e);
  }
}
