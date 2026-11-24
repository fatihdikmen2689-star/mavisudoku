import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { Yakinda } from '../../bilesenler/Yakinda.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sudoku taktikleri' };

export default async function Sayfa() {
  return (
    <>
      <UstMenu oyuncu={await mevcutOyuncu()} aktif={'taktikler'} />
      <Yakinda baslik="Sudoku taktikleri" metin="Başlangıç rehberinden X-Wing tekniğine kadar adım adım yazılar hazırlanıyor." />
    </>
  );
}
