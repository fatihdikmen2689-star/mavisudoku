/**
 * Sunucu istemcisi. Web sitesiyle aynı API'yi kullanır; çerez yerine
 * "Authorization: Bearer uye.<jeton>" ya da "Bearer misafir.<jeton>" başlığı gönderir.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { gizliOku, gizliYaz } from './depo.ts';

const JETON = 'ms.jeton';
const ayar = (Constants.expoConfig?.extra ?? {}) as { apiAdresi?: string };
/** Geliştirmede EXPO_PUBLIC_API_ADRESI ile değiştirilebilir (ör. http://192.168.1.20:3000); web denemesinde aynı köken */
export const API_ADRESI = process.env.EXPO_PUBLIC_API_ADRESI ?? (Platform.OS === 'web' ? '' : ayar.apiAdresi ?? 'https://mavisudoku.com');

export type Jeton = { tur: 'uye' | 'misafir'; deger: string };
let bellekte: Jeton | null | undefined;

export async function jetonOku(): Promise<Jeton | null> {
  if (bellekte !== undefined) return bellekte;
  const h = await gizliOku(JETON);
  const m = h ? /^(uye|misafir)\.(.+)$/.exec(h) : null;
  bellekte = m ? { tur: m[1] as Jeton['tur'], deger: m[2] } : null;
  return bellekte;
}
export async function jetonYaz(j: Jeton | null): Promise<void> {
  bellekte = j;
  await gizliYaz(JETON, j ? `${j.tur}.${j.deger}` : null);
}

export class ApiHatasi extends Error {
  constructor(mesaj: string, public durum: number, public alan?: string) { super(mesaj); }
}

export async function api<T>(yol: string, secenek: { yontem?: 'GET' | 'POST'; govde?: unknown } = {}): Promise<T> {
  const j = await jetonOku();
  let r: Response;
  try {
    r = await fetch(API_ADRESI + yol, {
      method: secenek.yontem ?? (secenek.govde !== undefined ? 'POST' : 'GET'),
      headers: {
        'X-Istemci': 'mobil',
        ...(j ? { Authorization: `Bearer ${j.tur}.${j.deger}` } : {}),
        ...(secenek.govde !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: secenek.govde !== undefined ? JSON.stringify(secenek.govde) : undefined,
    });
  } catch {
    throw new ApiHatasi('İnternet bağlantısı yok gibi görünüyor. Bağlantını kontrol edip tekrar dene.', 0);
  }
  const v = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiHatasi(v.hata ?? 'Bir sorun oluştu, tekrar dene.', r.status, v.alan);
  return v as T;
}
