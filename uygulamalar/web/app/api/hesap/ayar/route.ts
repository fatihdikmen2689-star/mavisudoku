import { veritabani } from '../../../../sunucu/db.ts';
import { ayarGuncelle } from '../../../../sunucu/hesap.ts';
import { mevcutOyuncu, kaynakKontrol, govde, hataYaniti } from '../../../../sunucu/istek.ts';

export async function POST(istek: Request) {
  try {
    kaynakKontrol(istek);
    await ayarGuncelle(await veritabani(), await mevcutOyuncu(), await govde(istek));
    return Response.json({ tamam: true });
  } catch (e) {
    return hataYaniti(e);
  }
}
