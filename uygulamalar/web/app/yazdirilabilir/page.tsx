import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { Yakinda } from '../../bilesenler/Yakinda.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Çocuklar için yazdırılabilir sudoku' };

export default async function Sayfa() {
  return (
    <>
      <UstMenu oyuncu={await mevcutOyuncu()} aktif={'yazdirilabilir'} />
      <Yakinda baslik="Çocuklar için yazdırılabilir sudoku" metin="4×4 ve 6×6 Mini sudokuları PDF olarak indirebileceğin sayfa hazırlanıyor. Şimdilik Mini seviyeleri sitede oynayabilirsin." />
    </>
  );
}
