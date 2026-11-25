import { veritabani } from '../../../../sunucu/db.ts';
import { misafirOlustur, MOBIL_MISAFIR_GUNLUK_IP_SINIRI } from '../../../../sunucu/kimlik.ts';
import { hataYaniti, ipAl } from '../../../../sunucu/istek.ts';

/** Mobil uygulama ilk açılışta misafir kimliği alır; jetonu cihazın güvenli deposunda saklar */
export async function POST(istek: Request) {
  try {
    const { oyuncu, jeton } = await misafirOlustur(await veritabani(), ipAl(istek), MOBIL_MISAFIR_GUNLUK_IP_SINIRI);
    return Response.json({ jeton, oyuncu: { tip: 'misafir', ad: oyuncu.tip === 'misafir' ? oyuncu.ad : '' } });
  } catch (e) {
    return hataYaniti(e);
  }
}
