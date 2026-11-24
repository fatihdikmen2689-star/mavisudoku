import { veritabani } from '../../../sunucu/db.ts';
import { rumuzMusait } from '../../../sunucu/kimlik.ts';
import { hataYaniti } from '../../../sunucu/istek.ts';

export async function GET(istek: Request) {
  try {
    const ad = new URL(istek.url).searchParams.get('ad') ?? '';
    return Response.json(await rumuzMusait(await veritabani(), ad));
  } catch (e) {
    return hataYaniti(e);
  }
}
