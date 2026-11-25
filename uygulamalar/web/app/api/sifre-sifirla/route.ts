import { veritabani } from '../../../sunucu/db.ts';
import { sifreSifirlamaIste } from '../../../sunucu/hesap.ts';
import { kaynakKontrol, govde, hataYaniti, ipAl } from '../../../sunucu/istek.ts';

/** Bağlantıdaki adres istekten değil ayardan gelir: sahte Host başlığıyla başka siteye bağlantı gönderilemesin */
function siteAdresi(istek: Request): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  return process.env.NODE_ENV === 'production' ? 'https://mavisudoku.com' : new URL(istek.url).origin;
}

export async function POST(istek: Request) {
  try {
    kaynakKontrol(istek);
    const g = await govde<{ eposta: string }>(istek);
    await sifreSifirlamaIste(await veritabani(), g.eposta, ipAl(istek), siteAdresi(istek));
    return Response.json({ tamam: true });
  } catch (e) {
    return hataYaniti(e);
  }
}
