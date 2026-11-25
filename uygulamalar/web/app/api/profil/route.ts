import { veritabani } from '../../../sunucu/db.ts';
import { mevcutOyuncu, hataYaniti } from '../../../sunucu/istek.ts';
import { profil } from '../../../sunucu/hesap.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(await profil(await veritabani(), await mevcutOyuncu()), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return hataYaniti(e);
  }
}
