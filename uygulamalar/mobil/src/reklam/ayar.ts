/**
 * AdMob reklam birimleri. Gerçek kimlikler AdMob hesabı açılınca .env dosyasına girilir
 * (EXPO_PUBLIC_ADMOB_* değişkenleri). Girilmemişse Google'ın test reklamları gösterilir; bu
 * reklamlar para kazandırmaz ama hesabın kapanmasına da yol açmaz.
 */
import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

const sec = (android?: string, ios?: string) => (Platform.OS === 'ios' ? ios : android) || undefined;

export const BIRIM = {
  banner: (!__DEV__ && sec(process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID, process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS)) || TestIds.ADAPTIVE_BANNER,
  gecis: (!__DEV__ && sec(process.env.EXPO_PUBLIC_ADMOB_GECIS_ANDROID, process.env.EXPO_PUBLIC_ADMOB_GECIS_IOS)) || TestIds.INTERSTITIAL,
};

/** Tam ekran reklam: en fazla her 3 çözümde bir ve aralarında en az 3 dakika */
export const GECIS_HER = 3;
export const GECIS_ARA_MS = 3 * 60_000;
