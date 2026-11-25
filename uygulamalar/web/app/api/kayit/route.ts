import { veritabani } from '../../../sunucu/db.ts';
import { kayitOl, oturumAc, misafirAktar } from '../../../sunucu/kimlik.ts';
import type { KayitGirdisi } from '../../../sunucu/kimlik.ts';
import { mevcutOyuncu, kaynakKontrol, govde, hataYaniti, oturumCereziYaz, cerezleriTemizle, MISAFIR_CEREZ, mobilIstek } from '../../../sunucu/istek.ts';

export async function POST(istek: Request) {
  try {
    kaynakKontrol(istek);
    const g = await govde<KayitGirdisi & { aktar?: boolean }>(istek);
    const db = await veritabani();
    const onceki = await mevcutOyuncu();
    const uye = await kayitOl(db, g);
    let aktarilan = 0;
    if (onceki?.tip === 'misafir' && g.aktar !== false) aktarilan = await misafirAktar(db, onceki.id, uye.id);
    const jeton = await oturumAc(db, uye.id);
    // Mobil uygulama jetonu kendisi saklar; web sitesine çerez yazılır
    if (await mobilIstek(istek)) return Response.json({ tamam: true, aktarilan, jeton, oyuncu: { tip: 'uye', ad: uye.tip === 'uye' ? uye.rumuz : '' } });
    await oturumCereziYaz(jeton);
    if (onceki?.tip === 'misafir') await cerezleriTemizle(MISAFIR_CEREZ);
    return Response.json({ tamam: true, aktarilan });
  } catch (e) {
    return hataYaniti(e);
  }
}
