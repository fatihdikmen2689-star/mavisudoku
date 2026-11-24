/**
 * İstek yardımcıları: çerezler, mevcut oyuncu, güvenlik kontrolleri, hata yanıtları.
 */
import { cookies } from 'next/headers';
import { veritabani } from './db.ts';
import { oturumBul, misafirBul, misafirOlustur, KimlikHatasi, OTURUM_GUN } from './kimlik.ts';
import type { Oyuncu } from './kimlik.ts';
import { OyunHatasi } from './oyun.ts';

export const OTURUM_CEREZ = 'ms_oturum';
export const MISAFIR_CEREZ = 'ms_misafir';

const cerezAyari = (gun: number) => ({
  httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: gun * 86400,
});

/** Giriş yapmış üye ya da çerezi olan misafir (yoksa null). Sayfalarda kullanılabilir; çerez yazmaz. */
export async function mevcutOyuncu(): Promise<Oyuncu | null> {
  const c = await cookies();
  const db = await veritabani();
  return (await oturumBul(db, c.get(OTURUM_CEREZ)?.value)) ?? (await misafirBul(db, c.get(MISAFIR_CEREZ)?.value));
}

/** Yalnızca API uçlarında: oyuncu yoksa yeni misafir oluşturur ve çerezini yazar. */
export async function oyuncuGerekli(istek: Request): Promise<Oyuncu> {
  const var_ = await mevcutOyuncu();
  if (var_) return var_;
  const db = await veritabani();
  const { oyuncu, jeton } = await misafirOlustur(db, ipAl(istek));
  (await cookies()).set(MISAFIR_CEREZ, jeton, cerezAyari(365));
  return oyuncu;
}

export async function oturumCereziYaz(jeton: string): Promise<void> {
  const c = await cookies();
  c.set(OTURUM_CEREZ, jeton, cerezAyari(OTURUM_GUN));
}

export async function cerezleriTemizle(...adlar: string[]): Promise<void> {
  const c = await cookies();
  for (const ad of adlar) c.delete(ad);
}

export function ipAl(istek: Request): string {
  const h = istek.headers;
  return (h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'yerel').trim();
}

/** Başka sitelerden gelen form/istekleri reddet (çerezli isteklerde CSRF koruması) */
export function kaynakKontrol(istek: Request): void {
  const kaynak = istek.headers.get('origin');
  if (!kaynak) return;
  const host = istek.headers.get('x-forwarded-host') ?? istek.headers.get('host');
  if (new URL(kaynak).host !== host) throw new OyunHatasi('Geçersiz istek kaynağı.', 403);
}

export async function govde<T>(istek: Request): Promise<T> {
  try {
    return (await istek.json()) as T;
  } catch {
    throw new OyunHatasi('İstek gövdesi okunamadı.');
  }
}

export function hataYaniti(e: unknown): Response {
  if (e instanceof OyunHatasi) return Response.json({ hata: e.message }, { status: e.durum });
  if (e instanceof KimlikHatasi) return Response.json({ hata: e.message, alan: e.alan }, { status: 400 });
  console.error(e);
  return Response.json({ hata: 'Beklenmeyen bir sorun oluştu. Lütfen tekrar dene.' }, { status: 500 });
}
