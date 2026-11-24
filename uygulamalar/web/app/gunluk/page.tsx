import { redirect } from 'next/navigation';
import { veritabani } from '../../sunucu/db.ts';
import { gununBulmacasi } from '../../sunucu/oyun.ts';

export const dynamic = 'force-dynamic';

export default async function Gunluk() {
  redirect(`/bulmaca/${await gununBulmacasi(await veritabani())}`);
}
