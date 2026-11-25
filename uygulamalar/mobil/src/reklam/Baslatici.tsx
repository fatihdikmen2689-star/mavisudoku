/**
 * Açılışta reklam onayı ve SDK başlatma. Google'ın onay aracı (UMP) kullanıcının ülkesinde gerekiyorsa
 * onay formunu gösterir; onay alınamazsa reklam istenmez. Reklamlar aile dostu (PG) içerikle sınırlıdır.
 */
import { useEffect } from 'react';
import mobileAds, { AdsConsent, MaxAdContentRating } from 'react-native-google-mobile-ads';
import { reklamHazirAyarla } from './durum.ts';

export function ReklamBaslatici() {
  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const onay = await AdsConsent.gatherConsent();
        if (!onay.canRequestAds || iptal) return;
        await mobileAds().setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.PG, tagForChildDirectedTreatment: false });
        await mobileAds().initialize();
        if (!iptal) reklamHazirAyarla(true);
      } catch {
        // Onay ya da başlatma başarısız: uygulama reklamsız çalışmaya devam eder
      }
    })();
    return () => { iptal = true; };
  }, []);
  return null;
}

/** Profil ekranındaki "Reklam ve gizlilik tercihleri" */
export async function gizlilikTercihleriniAc(): Promise<boolean> {
  try { await AdsConsent.showPrivacyOptionsForm(); return true; } catch { return false; }
}
