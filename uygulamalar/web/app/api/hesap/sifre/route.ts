import { veritabani } from '../../../../sunucu/db.ts';
import { sifreDegistir } from '../../../../sunucu/hesap.ts';
import { mevcutOyuncu, kaynakKontrol, govde, hataYaniti, jetonlar } from '../../../../sunucu/istek.ts';

export async function POST(istek: Request) {
  try {
    kaynakKontrol(istek);
    const g = await govde<{ eski: string; yeni: string }>(istek);
    await sifreDegistir(await veritabani(), await mevcutOyuncu(), g.eski, g.yeni, (await jetonlar()).oturum);
    return Response.json({ tamam: true });
  } catch (e) {
    return hataYaniti(e);
  }
}
