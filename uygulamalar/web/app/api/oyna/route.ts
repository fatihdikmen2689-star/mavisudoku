import { veritabani } from '../../../sunucu/db.ts';
import { oyunVer, seviyeMi, OyunHatasi } from '../../../sunucu/oyun.ts';
import { oyuncuGerekli, kaynakKontrol, govde, hataYaniti } from '../../../sunucu/istek.ts';

/** Oyuncuya bulmaca verir: { seviye, bulmacaId?, yeni? } */
export async function POST(istek: Request) {
  try {
    kaynakKontrol(istek);
    const g = await govde<{ seviye?: string; bulmacaId?: number; yeni?: boolean }>(istek);
    if (!seviyeMi(g.seviye)) throw new OyunHatasi('Geçersiz seviye.');
    const oyuncu = await oyuncuGerekli(istek);
    const db = await veritabani();
    const bid = g.bulmacaId ? Number(g.bulmacaId) : undefined;
    const oyun = await oyunVer(db, oyuncu, g.seviye, Number.isInteger(bid) && bid! > 0 ? bid : undefined, g.yeni === true);
    return Response.json({ oyun, oyuncu: { tip: oyuncu.tip, ad: oyuncu.tip === 'uye' ? oyuncu.rumuz : oyuncu.ad } });
  } catch (e) {
    return hataYaniti(e);
  }
}
