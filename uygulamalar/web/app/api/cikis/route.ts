import { cookies } from 'next/headers';
import { veritabani } from '../../../sunucu/db.ts';
import { oturumKapat } from '../../../sunucu/kimlik.ts';
import { kaynakKontrol, hataYaniti, cerezleriTemizle, OTURUM_CEREZ } from '../../../sunucu/istek.ts';

export async function POST(istek: Request) {
  try {
    kaynakKontrol(istek);
    const db = await veritabani();
    await oturumKapat(db, (await cookies()).get(OTURUM_CEREZ)?.value);
    await cerezleriTemizle(OTURUM_CEREZ);
    return Response.json({ tamam: true });
  } catch (e) {
    return hataYaniti(e);
  }
}
