import { veritabani } from '../../../sunucu/db.ts';
import { kayitOl, oturumAc, misafirAktar } from '../../../sunucu/kimlik.ts';
import type { KayitGirdisi } from '../../../sunucu/kimlik.ts';
import { mevcutOyuncu, kaynakKontrol, govde, hataYaniti, oturumCereziYaz, cerezleriTemizle, MISAFIR_CEREZ } from '../../../sunucu/istek.ts';

export async function POST(istek: Request) {
  try {
    kaynakKontrol(istek);
    const g = await govde<KayitGirdisi & { aktar?: boolean }>(istek);
    const db = await veritabani();
    const onceki = await mevcutOyuncu();
    const uye = await kayitOl(db, g);
    let aktarilan = 0;
    if (onceki?.tip === 'misafir' && g.aktar !== false) aktarilan = await misafirAktar(db, onceki.id, uye.id);
    await oturumCereziYaz(await oturumAc(db, uye.id));
    if (onceki?.tip === 'misafir') await cerezleriTemizle(MISAFIR_CEREZ);
    return Response.json({ tamam: true, aktarilan });
  } catch (e) {
    return hataYaniti(e);
  }
}
