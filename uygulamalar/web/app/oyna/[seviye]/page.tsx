import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { UstMenu } from '../../../bilesenler/UstMenu.tsx';
import { OyunEkrani } from '../../../bilesenler/OyunEkrani.tsx';
import { mevcutOyuncu } from '../../../sunucu/istek.ts';
import { veritabani } from '../../../sunucu/db.ts';
import { oyuncuOzeti, seviyeMi } from '../../../sunucu/oyun.ts';
import { SEVIYE_UI } from '../../../lib/bicim.ts';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ seviye: string }> }): Promise<Metadata> {
  const { seviye } = await params;
  return seviyeMi(seviye) ? { title: `${SEVIYE_UI[seviye].ad} sudoku çöz` } : {};
}

export default async function OynaSayfasi({ params, searchParams }: { params: Promise<{ seviye: string }>; searchParams: Promise<{ bulmaca?: string }> }) {
  const { seviye } = await params;
  if (!seviyeMi(seviye)) notFound();
  const b = Number((await searchParams).bulmaca);
  const oyuncu = await mevcutOyuncu();
  const ozet = await oyuncuOzeti(await veritabani(), oyuncu);
  const s = ozet.seviyeler[seviye];
  return (
    <>
      <UstMenu oyuncu={oyuncu} aktif="seviyeler" seri={ozet.seri} />
      <OyunEkrani seviye={seviye} bulmacaId={Number.isInteger(b) && b > 0 ? b : undefined} ozet={{ cozulen: s?.cozulen ?? 0, enIyi: s?.enIyi ?? null }} uye={oyuncu?.tip === 'uye'} />
    </>
  );
}
