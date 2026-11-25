/**
 * Cihazda saklama. Oturum jetonu iOS Anahtar Zinciri / Android Keystore'da (SecureStore),
 * oyun ilerlemesi gibi büyük ve hassas olmayan veriler AsyncStorage'da tutulur.
 * Web çıktısında (yalnızca deneme için) SecureStore yoktur; localStorage kullanılır.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function gizliOku(anahtar: string): Promise<string | null> {
  if (Platform.OS === 'web') { try { return localStorage.getItem(anahtar); } catch { return null; } }
  return SecureStore.getItemAsync(anahtar);
}
export async function gizliYaz(anahtar: string, deger: string | null): Promise<void> {
  if (Platform.OS === 'web') { try { if (deger === null) localStorage.removeItem(anahtar); else localStorage.setItem(anahtar, deger); } catch { /* yok say */ } return; }
  if (deger === null) await SecureStore.deleteItemAsync(anahtar); else await SecureStore.setItemAsync(anahtar, deger);
}

export async function oku<T>(anahtar: string): Promise<T | null> {
  try { const h = await AsyncStorage.getItem(anahtar); return h ? (JSON.parse(h) as T) : null; } catch { return null; }
}
export async function yaz(anahtar: string, deger: unknown): Promise<void> {
  try { await AsyncStorage.setItem(anahtar, JSON.stringify(deger)); } catch { /* yer yok */ }
}
export async function sil(anahtar: string): Promise<void> {
  try { await AsyncStorage.removeItem(anahtar); } catch { /* yok say */ }
}
