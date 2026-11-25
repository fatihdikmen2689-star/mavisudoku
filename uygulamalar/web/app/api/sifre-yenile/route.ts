import { veritabani } from '../../../sunucu/db.ts';
import { sifreYenile } from '../../../sunucu/hesap.ts';
import { oturumAc } from '../../../sunucu/kimlik.ts';
import { kaynakKontrol, govde, hataYaniti, oturumCereziYaz } from '../../../sunucu/istek.ts';

export async function POST(istek: Request) {
  try {
    kaynakKontrol(istek);
    const g = await govde<{ jeton: string; sifre: string }>(istek);
    const db = await veritabani();
    const id = await sifreYenile(db, g.jeton, g.sifre);
    await oturumCereziYaz(await oturumAc(db, id));
    return Response.json({ tamam: true });
  } catch (e) {
    return hataYaniti(e);
  }
}
