import { veritabani } from '../../../sunucu/db.ts';
import { girisYap, oturumAc, misafirAktar } from '../../../sunucu/kimlik.ts';
import { OyunHatasi } from '../../../sunucu/oyun.ts';
import { mevcutOyuncu, kaynakKontrol, govde, hataYaniti, oturumCereziYaz, cerezleriTemizle, MISAFIR_CEREZ, ipAl, mobilIstek } from '../../../sunucu/istek.ts';

/** Basit kaba kuvvet koruması: IP başına 15 dakikada en fazla 10 başarısız deneme (sunucu belleğinde) */
const denemeler = new Map<string, { sayi: number; bitis: number }>();

export async function POST(istek: Request) {
  try {
    kaynakKontrol(istek);
    const ip = ipAl(istek);
    const d = denemeler.get(ip);
    if (d && d.bitis > Date.now() && d.sayi >= 10) throw new OyunHatasi('Çok fazla deneme yapıldı. 15 dakika sonra tekrar dene.', 429);
    const g = await govde<{ kimlik: string; sifre: string; aktar?: boolean }>(istek);
    const db = await veritabani();
    const uye = await girisYap(db, g.kimlik, g.sifre);
    if (!uye) {
      const yeni = d && d.bitis > Date.now() ? { sayi: d.sayi + 1, bitis: d.bitis } : { sayi: 1, bitis: Date.now() + 15 * 60_000 };
      denemeler.set(ip, yeni);
      throw new OyunHatasi('E-posta/rumuz veya şifre hatalı.', 401);
    }
    denemeler.delete(ip);
    const onceki = await mevcutOyuncu();
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
