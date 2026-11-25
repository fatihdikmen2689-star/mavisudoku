import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BIRIM } from './ayar.ts';
import { reklamHazirMi, reklamDinle } from './durum.ts';

/** Ekranın altına sabitlenen uyarlanabilir şerit reklam. Onay yoksa hiçbir şey göstermez. */
export function Banner() {
  const [hazir, setHazir] = useState(reklamHazirMi());
  const [hata, setHata] = useState(false);
  useEffect(() => reklamDinle(setHazir), []);
  if (!hazir || hata) return null;
  return (
    <View style={{ alignItems: 'center', backgroundColor: '#fff' }} accessibilityLabel="Reklam">
      <BannerAd unitId={BIRIM.banner} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} onAdFailedToLoad={() => setHata(true)} />
    </View>
  );
}
