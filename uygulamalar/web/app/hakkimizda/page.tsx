import { UstMenu } from '../../bilesenler/UstMenu.tsx';
import { Yakinda } from '../../bilesenler/Yakinda.tsx';
import { mevcutOyuncu } from '../../sunucu/istek.ts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Hakkımızda' };

export default async function Sayfa() {
  return (
    <>
      <UstMenu oyuncu={await mevcutOyuncu()} aktif={null} />
      <Yakinda baslik="Hakkımızda" metin="MaviSudoku, Türkçe, ücretsiz ve sakin bir sudoku deneyimi için kuruldu. Bu sayfanın metni hazırlanıyor." />
    </>
  );
}
