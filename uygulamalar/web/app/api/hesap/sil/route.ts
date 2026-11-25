import { veritabani } from '../../../../sunucu/db.ts';
import { hesapSil } from '../../../../sunucu/hesap.ts';
import { mevcutOyuncu, kaynakKontrol, govde, hataYaniti, cerezleriTemizle, OTURUM_CEREZ, MISAFIR_CEREZ } from '../../../../sunucu/istek.ts';

export async function POST(istek: Request) {
  try {
    kaynakKontrol(istek);
    const g = await govde<{ sifre: string; onay: string }>(istek);
    await hesapSil(await veritabani(), await mevcutOyuncu(), g.sifre, g.onay);
    await cerezleriTemizle(OTURUM_CEREZ, MISAFIR_CEREZ);
    return Response.json({ tamam: true });
  } catch (e) {
    return hataYaniti(e);
  }
}
