/**
 * Oyun ekranı. Bulmaca sunucudan gelir (her bulmaca oyuncuya bir kez); ilerleme cihazda saklanır,
 * bitince çözüm sunucuda doğrulanıp sıralamaya yazılır. Uygulama arka plana atılınca süre durur.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { duzen, metindenIzgara, SEVIYE_SIRASI, type SeviyeId } from '@mavisudoku/motor';
import { api, ApiHatasi } from '../../lib/api.ts';
import { oku, yaz, sil } from '../../lib/depo.ts';
import { useOturum } from '../../lib/oturum.tsx';
import { sureMetni, sayi, SEVIYE_UI } from '../../lib/bicim.ts';
import { R, Y } from '../../lib/tema.ts';
import type { BittiSonucu, VerilenOyun } from '../../lib/tipler.ts';
import { Tahta } from '../../bilesenler/Tahta.tsx';
import { Dugme, Uyari, Yazi, Yukleniyor } from '../../bilesenler/ortak.tsx';
import { Banner } from '../../reklam/Banner';
import { gecisHazirla, bulmacaBitti, siradakiyeGecerken } from '../../reklam/gecis';

interface Adim { i: number; deger: number; not: number }
interface Ilerleme { girilen: number[]; notlar: number[]; hata: number; ipucu: number; gecen: number }
const anahtar = (oyunId: number) => `ms.oyun.${oyunId}`;

/** Sunucunun karıştırdığı çözümü açar (web ile aynı işlem) */
const cozumAc = (k: string, a: number) => [...k].map((c, i) => Number(String.fromCharCode(c.charCodeAt(0) ^ (((a * 31 + i * 17) % 23) + 1))));

export default function OyunEkrani() {
  const p = useLocalSearchParams<{ seviye: string; bulmaca?: string }>();
  const seviye = (SEVIYE_SIRASI as string[]).includes(p.seviye) ? (p.seviye as SeviyeId) : 'kolay';
  const istenen = Number(p.bulmaca) > 0 ? Number(p.bulmaca) : undefined;
  const { oyuncu } = useOturum();
  const { width } = useWindowDimensions();
  const [oyun, setOyun] = useState<VerilenOyun | null>(null);
  const [ilerleme, setIlerleme] = useState<Ilerleme | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [secili, setSecili] = useState(-1);
  const [notModu, setNotModu] = useState(false);
  const [duraklat, setDuraklat] = useState(false);
  const [sonuc, setSonuc] = useState<BittiSonucu | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const gecmis = useRef<Adim[]>([]);
  const gonderilen = useRef<number | null>(null);
  const cocuk = seviye === 'mini4' || seviye === 'mini6';

  const yukle = useCallback(async (yeni: boolean) => {
    setHata(null); setSonuc(null); setOyun(null); setIlerleme(null); gecmis.current = [];
    try {
      const v = await api<{ oyun: VerilenOyun }>('/api/oyna', { govde: { seviye, bulmacaId: yeni ? undefined : istenen, yeni } });
      const o = v.oyun, n = o.bulmaca.length;
      const kayitli = await oku<Ilerleme>(anahtar(o.oyunId));
      setIlerleme(kayitli && kayitli.girilen.length === n ? kayitli
        : { girilen: Array(n).fill(0), notlar: Array(n).fill(0), hata: 0, ipucu: 0, gecen: o.devam ? Math.max(0, Math.min(o.gecenSaniye, 3600)) : 0 });
      setOyun(o);
      setSecili(metindenIzgara(o.bulmaca).findIndex((x) => !x));
      setDuraklat(false); setNotModu(false);
      if (!cocuk) gecisHazirla();
    } catch (e) {
      setHata(e instanceof ApiHatasi ? e.message : 'Bulmaca yüklenemedi.');
    }
  }, [seviye, istenen, cocuk]);

  useEffect(() => { if (oyuncu) void yukle(false); }, [oyuncu, yukle]);

  const bulmaca = useMemo(() => (oyun ? metindenIzgara(oyun.bulmaca) : []), [oyun]);
  const cozum = useMemo(() => (oyun ? cozumAc(oyun.cozumK, oyun.oyunId) : []), [oyun]);
  const d = useMemo(() => duzen((oyun ? Math.round(Math.sqrt(oyun.bulmaca.length)) : 9) as 4 | 6 | 9), [oyun]);
  const bitti = !!sonuc;

  // İlerlemeyi sakla
  useEffect(() => { if (oyun && ilerleme && !bitti) void yaz(anahtar(oyun.oyunId), ilerleme); }, [oyun, ilerleme, bitti]);

  // Süre: duraklatınca ya da uygulama arka plandayken durur
  const [onPlanda, setOnPlanda] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const a = AppState.addEventListener('change', (s) => { setOnPlanda(s === 'active'); if (s !== 'active') setDuraklat(true); });
    return () => a.remove();
  }, []);
  useEffect(() => {
    if (!oyun || bitti || duraklat || !onPlanda) return;
    const t = setInterval(() => setIlerleme((x) => (x ? { ...x, gecen: x.gecen + 1 } : x)), 1000);
    return () => clearInterval(t);
  }, [oyun, bitti, duraklat, onPlanda]);

  const bitir = useCallback(async (x: Ilerleme) => {
    if (!oyun) return;
    setGonderiliyor(true);
    try {
      const cevap = bulmaca.map((v, i) => v || x.girilen[i]).join('');
      const v = await api<{ sonuc: BittiSonucu }>(`/api/oyun/${oyun.oyunId}/bitir`, { govde: { cevap, sure: x.gecen, hata: x.hata, ipucu: x.ipucu } });
      setSonuc(v.sonuc);
      void sil(anahtar(oyun.oyunId));
      bulmacaBitti(cocuk);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (e) {
      setHata(e instanceof ApiHatasi ? e.message : 'Sonuç gönderilemedi.');
      gonderilen.current = null;
    } finally {
      setGonderiliyor(false);
    }
  }, [oyun, bulmaca, cocuk]);

  // Tahta doğru dolunca bir kez gönder
  useEffect(() => {
    if (!oyun || !ilerleme || sonuc || gonderilen.current === oyun.oyunId || !cozum.length) return;
    if (cozum.every((v, i) => (bulmaca[i] || ilerleme.girilen[i]) === v)) { gonderilen.current = oyun.oyunId; void bitir(ilerleme); }
  }, [oyun, ilerleme, sonuc, cozum, bulmaca, bitir]);

  const guncelle = (f: (x: Ilerleme) => Ilerleme | null) => { if (!ilerleme) return; const y = f(ilerleme); if (y) setIlerleme(y); };

  const rakamGir = (v: number) => {
    if (!oyun || bitti || duraklat || secili < 0 || bulmaca[secili]) return;
    guncelle((x) => {
      const i = secili;
      if (notModu ? !!x.girilen[i] : x.girilen[i] === v) return null;
      gecmis.current.push({ i, deger: x.girilen[i], not: x.notlar[i] });
      const girilen = x.girilen.slice(), notlar = x.notlar.slice();
      let h = x.hata;
      if (notModu) notlar[i] ^= 1 << (v - 1);
      else {
        girilen[i] = v; notlar[i] = 0;
        if (v !== cozum[i]) { h++; void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined); }
        else for (const j of d.komsular[i]) notlar[j] &= ~(1 << (v - 1));
      }
      return { ...x, girilen, notlar, hata: h };
    });
  };
  const temizle = () => {
    if (bitti || duraklat || secili < 0 || bulmaca[secili]) return;
    guncelle((x) => {
      if (!x.girilen[secili] && !x.notlar[secili]) return null;
      gecmis.current.push({ i: secili, deger: x.girilen[secili], not: x.notlar[secili] });
      const girilen = x.girilen.slice(), notlar = x.notlar.slice();
      girilen[secili] = 0; notlar[secili] = 0;
      return { ...x, girilen, notlar };
    });
  };
  const geriAl = () => {
    const a = gecmis.current.pop();
    if (!a || bitti || duraklat) return;
    setSecili(a.i);
    guncelle((x) => { const girilen = x.girilen.slice(), notlar = x.notlar.slice(); girilen[a.i] = a.deger; notlar[a.i] = a.not; return { ...x, girilen, notlar }; });
  };
  const ipucuVer = () => {
    if (!oyun || bitti || duraklat || !ilerleme) return;
    let i = secili;
    if (i < 0 || bulmaca[i] || ilerleme.girilen[i] === cozum[i]) i = cozum.findIndex((v, k) => !bulmaca[k] && ilerleme.girilen[k] !== v);
    if (i < 0) return;
    setSecili(i);
    guncelle((x) => {
      gecmis.current.push({ i, deger: x.girilen[i], not: x.notlar[i] });
      const girilen = x.girilen.slice(), notlar = x.notlar.slice();
      girilen[i] = cozum[i]; notlar[i] = 0;
      for (const j of d.komsular[i]) notlar[j] &= ~(1 << (cozum[i] - 1));
      return { ...x, girilen, notlar, ipucu: x.ipucu + 1 };
    });
  };

  const ui = SEVIYE_UI[seviye];
  const boyut = Math.min(width - 24, 520);
  const x = ilerleme;
  const kalan = x ? bulmaca.filter((v, i) => !v && !x.girilen[i]).length : 0;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{
        title: oyun ? `#${oyun.bulmacaId} · ${ui.ad}` : ui.ad,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text accessibilityRole="timer" style={s.sure}>{sureMetni(x?.gecen ?? 0)}</Text>
            {!bitti && oyun && (
              <Pressable accessibilityRole="button" accessibilityLabel={duraklat ? 'Devam et' : 'Duraklat'} onPress={() => setDuraklat((v) => !v)} hitSlop={10} style={s.kareDugme}>
                <Text style={{ color: '#fff', fontFamily: Y.kalin, fontSize: 14 }}>{duraklat ? '▶' : 'II'}</Text>
              </Pressable>
            )}
          </View>
        ),
      }} />
      <ScrollView contentContainerStyle={{ padding: 12, gap: 12, alignItems: 'center' }}>
        {hata && (
          <View style={{ width: boyut, gap: 8 }}>
            <Uyari metin={hata} />
            {x && oyun && !sonuc && cozum.every((v, i) => (bulmaca[i] || x.girilen[i]) === v)
              ? <Dugme tur="ikincil" metin="Tekrar gönder" onPress={() => { gonderilen.current = oyun.oyunId; void bitir(x); }} />
              : <Dugme tur="ikincil" metin="Yeni bulmaca" onPress={() => void yukle(true)} />}
          </View>
        )}
        {sonuc && <SonucPaneli sonuc={sonuc} uye={oyuncu?.tip === 'uye'} ad={oyuncu?.ad ?? ''} genislik={boyut}
          onSiradaki={() => { siradakiyeGecerken(); void yukle(true); }} />}
        {!sonuc && oyun && x && (
          <>
            <View style={[s.durum, { width: boyut }]}>
              <Yazi style={s.durumYazi}>Hata <Text style={{ color: R.kirmizi, fontFamily: Y.kalin }}>{x.hata}</Text></Yazi>
              <Yazi style={s.durumYazi}>İpucu <Text style={{ fontFamily: Y.kalin }}>{x.ipucu}</Text></Yazi>
              <Yazi style={s.durumYazi}>Kalan <Text style={{ color: R.mavi, fontFamily: Y.kalin }}>{kalan}</Text></Yazi>
            </View>
            <View>
              <Tahta d={d} boyut={boyut} bulmaca={bulmaca} girilen={x.girilen} notlar={x.notlar} cozum={cozum} secili={secili}
                hataGoster ayniVurgula kapali={duraklat} onSec={setSecili} />
              {duraklat && (
                <View style={[StyleSheet.absoluteFill, s.perde]}>
                  <Yazi style={{ fontFamily: Y.kalin, fontSize: 20, color: R.lacivert }}>Oyun duraklatıldı</Yazi>
                  <Dugme metin="Devam et" onPress={() => setDuraklat(false)} />
                </View>
              )}
            </View>
            <View style={[s.rakamlar, { width: boyut }]}>
              {Array.from({ length: d.n }, (_, k) => {
                const v = k + 1;
                let yerlesen = 0;
                for (let i = 0; i < cozum.length; i++) if ((bulmaca[i] || x.girilen[i]) === v && cozum[i] === v) yerlesen++;
                const kalanR = d.n - yerlesen;
                return (
                  <Pressable key={v} accessibilityRole="button" accessibilityLabel={`${v}, ${kalanR} kaldı`} disabled={kalanR === 0 && !notModu}
                    onPress={() => rakamGir(v)} style={({ pressed }) => [s.rakam, { width: (boyut - (d.n - 1) * 5) / d.n, opacity: kalanR === 0 && !notModu ? 0.35 : pressed ? 0.7 : 1 }]}>
                    <Text style={[s.rakamYazi, notModu && { color: R.soluk }]}>{v}</Text>
                    <Text style={s.rakamAlt}>{kalanR || '✓'}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={[s.araclar, { width: boyut }]}>
              <Arac metin="Geri al" onPress={geriAl} />
              <Arac metin="Sil" onPress={temizle} />
              <Arac metin={notModu ? 'Not: Açık' : 'Not: Kapalı'} acik={notModu} onPress={() => setNotModu((v) => !v)} />
              <Arac metin="İpucu" onPress={ipucuVer} />
            </View>
            {gonderiliyor && <Yazi style={{ color: R.soluk }}>Çözümün kontrol ediliyor…</Yazi>}
          </>
        )}
        {!oyun && !hata && !sonuc && <Yukleniyor metin="Bulmaca hazırlanıyor…" />}
      </ScrollView>
      {!cocuk && <Banner />}
    </View>
  );
}

function Arac({ metin, onPress, acik }: { metin: string; onPress: () => void; acik?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!acik }} onPress={onPress}
      style={({ pressed }) => [s.arac, acik && { backgroundColor: R.maviAcik }, pressed && { opacity: 0.75 }]}>
      <Text style={[s.aracYazi, acik && { color: '#fff' }]}>{metin}</Text>
    </Pressable>
  );
}

function SonucPaneli({ sonuc, uye, ad, genislik, onSiradaki }: { sonuc: BittiSonucu; uye: boolean; ad: string; genislik: number; onSiradaki: () => void }) {
  const ui = SEVIYE_UI[sonuc.seviye];
  return (
    <View style={[s.sonuc, { width: genislik }]}>
      <Yazi style={{ color: '#C9DBF5', fontFamily: Y.orta, fontSize: 13 }}>{ui.ad} · {sonuc.cozulenSeviyede} çözüldü{sonuc.rekor ? ' · Yeni kişisel rekor!' : ''}</Yazi>
      <Text accessibilityRole="header" style={{ color: '#fff', fontFamily: Y.kalin, fontSize: 26 }}>Tebrikler, çözdün!</Text>
      <View style={s.kutular}>
        <Kutu baslik="Süre" deger={sureMetni(sonuc.sure)} alt={sonuc.oncekiEnIyi ? `Önceki en iyin ${sureMetni(sonuc.oncekiEnIyi)}` : 'Bu seviyede ilk çözümün'} />
        <Kutu baslik="Sıralamada" deger={sonuc.sira ? `${sayi(sonuc.sira)}.` : '—'} alt={sonuc.siralamada ? `${sayi(sonuc.toplam)} kişi içinde` : 'Sıralamaya alınmadı'} />
        <Kutu baslik="Puan" deger={`+${sayi(sonuc.puan)}`} alt={`${sonuc.hata} hata · ${sonuc.ipucu ? `${sonuc.ipucu} ipucu` : 'ipucu yok'}`} />
        <Kutu baslik="Seri" deger={`${sonuc.seri} gün`} alt="Bugünkü seri tamam" turuncu />
      </View>
      {!sonuc.siralamada && <Uyari metin="Bu süre olağan dışı kısa olduğundan skor sıralamaya alınmadı." />}
      {!uye && (
        <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 10 }}>
          <Yazi style={{ color: R.lacivert }}><Text style={{ fontFamily: Y.kalin }}>{ad || 'Misafir'}</Text> olarak oynuyorsun. Skorunu ve serini kaybetmemek için ücretsiz kayıt ol.</Yazi>
          <Dugme tur="mavi" metin="Skorumu kaydet" onPress={() => router.push('/kayit')} kucuk />
        </View>
      )}
      <Dugme metin="Sıradaki bulmaca" onPress={onSiradaki} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Dugme tur="koyu" metin="Sıralama" onPress={() => router.push(`/bulmaca/${sonuc.bulmacaId}`)} style={{ flex: 1 }} kucuk />
        <Dugme tur="koyu" metin="Paylaş" style={{ flex: 1 }} kucuk onPress={() => {
          void Share.share({ message: `MaviSudoku'da ${ui.ad} bir bulmacayı ${sureMetni(sonuc.sure)} sürede çözdüm. Sen geçebilir misin? https://mavisudoku.com/bulmaca/${sonuc.bulmacaId}` }).catch(() => undefined);
        }} />
      </View>
    </View>
  );
}

function Kutu({ baslik, deger, alt, turuncu }: { baslik: string; deger: string; alt: string; turuncu?: boolean }) {
  return (
    <View style={s.kutu}>
      <Text style={{ color: '#9CB6DA', fontFamily: Y.orta, fontSize: 12 }}>{baslik}</Text>
      <Text style={{ color: turuncu ? '#FFC58F' : '#fff', fontFamily: Y.kalin, fontSize: 24, fontVariant: ['tabular-nums'] }}>{deger}</Text>
      <Text style={{ color: '#C9DBF5', fontFamily: Y.normal, fontSize: 12 }}>{alt}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  sure: { color: '#fff', fontFamily: Y.yari, fontSize: 17, fontVariant: ['tabular-nums'] },
  kareDugme: { width: 34, height: 34, borderRadius: 9, backgroundColor: R.lacivert2, alignItems: 'center', justifyContent: 'center' },
  durum: { flexDirection: 'row', justifyContent: 'space-between' },
  durumYazi: { color: R.soluk, fontSize: 14 },
  perde: { backgroundColor: 'rgba(243,247,252,0.94)', borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 14 },
  rakamlar: { flexDirection: 'row', justifyContent: 'space-between' },
  rakam: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: R.cizgi, paddingVertical: 8, alignItems: 'center' },
  rakamYazi: { fontFamily: Y.yari, fontSize: 24, color: R.mavi },
  rakamAlt: { fontFamily: Y.orta, fontSize: 10, color: R.soluk },
  araclar: { flexDirection: 'row', gap: 8 },
  arac: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: R.acik, alignItems: 'center', justifyContent: 'center' },
  aracYazi: { fontFamily: Y.yari, fontSize: 13.5, color: R.lacivert },
  sonuc: { backgroundColor: R.lacivert, borderRadius: 20, padding: 18, gap: 12 },
  kutular: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kutu: { flexBasis: '47%', flexGrow: 1, backgroundColor: R.lacivert2, borderRadius: 14, padding: 12, gap: 2 },
});
