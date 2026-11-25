import { veritabani } from '../../../../sunucu/db.ts';
import { verilerim } from '../../../../sunucu/hesap.ts';
import { mevcutOyuncu, hataYaniti } from '../../../../sunucu/istek.ts';

export const dynamic = 'force-dynamic';

/** KVKK: kişisel verilerin bir kopyası (JSON dosyası olarak iner) */
export async function GET() {
  try {
    const v = await verilerim(await veritabani(), await mevcutOyuncu());
    return new Response(JSON.stringify(v, null, 2), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="mavisudoku-verilerim.json"', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return hataYaniti(e);
  }
}
