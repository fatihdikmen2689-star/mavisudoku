import type { SeviyeId } from '@mavisudoku/motor';

export const sureMetni = (sn: number | null | undefined) =>
  sn == null ? '—' : `${String(Math.floor(sn / 60)).padStart(2, '0')}:${String(sn % 60).padStart(2, '0')}`;

export const sayi = (n: number) => n.toLocaleString('tr-TR');

/** Seviyelerin arayüz bilgileri (tasarımdaki renkler ve açıklamalar) */
export const SEVIYE_UI: Record<SeviyeId, { ad: string; renk: string; aciklama: string }> = {
  mini4: { ad: 'Mini 4×4', renk: '#C9E2FF', aciklama: 'Yalnızca 1–4. Çocuklar ve ilk kez deneyenler için.' },
  mini6: { ad: 'Mini 6×6', renk: '#B2D6FF', aciklama: '1–6 rakamları. Bir üst adım.' },
  kolay: { ad: 'Kolay', renk: '#9CCBFF', aciklama: 'Yeni başlayanlar için, tek aday yeterli.' },
  orta: { ad: 'Orta', renk: '#4C9BFF', aciklama: 'Gizli tekliler ve biraz not.' },
  zor: { ad: 'Zor', renk: '#1D5FD1', aciklama: 'İşaretleme ve aday çiftleri.' },
  uzman: { ad: 'Uzman', renk: '#16365F', aciklama: 'Gizli çiftler ve üçlüler.' },
  usta: { ad: 'Usta', renk: '#0F2A4F', aciklama: 'X-Wing, XY-Wing, Swordfish.' },
  ekstrem: { ad: 'Ekstrem', renk: '#0A1A33', aciklama: 'Tekniklerin yetmediği en zorlar.' },
};

export const TARIH_BICIMI = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
