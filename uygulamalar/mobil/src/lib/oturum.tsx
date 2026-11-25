/**
 * Oyuncu oturumu. İlk açılışta sunucudan misafir kimliği alınır (misafir1234); kayıt olunca ya da
 * giriş yapınca misafirin çözdükleri hesaba aktarılır ve üye jetonu saklanır.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, jetonOku, jetonYaz, ApiHatasi } from './api.ts';

export type Oyuncu = { tip: 'uye' | 'misafir'; ad: string };

export interface KayitGirdisi {
  ad: string; soyad: string; rumuz: string; eposta: string; sifre: string; dogumYili: number;
  gorunen: 'rumuz' | 'adsoyad'; yasGoster: boolean; kvkk: boolean; pazarlama: boolean; aktar: boolean;
}

interface OturumDegeri {
  oyuncu: Oyuncu | null;
  hazir: boolean;
  hata: string | null;
  yeniden: () => Promise<void>;
  giris: (kimlik: string, sifre: string) => Promise<number>;
  kayit: (g: KayitGirdisi) => Promise<number>;
  cikis: () => Promise<void>;
  hesapSilindi: () => Promise<void>;
}

const Baglam = createContext<OturumDegeri | null>(null);

async function misafirAl(): Promise<Oyuncu> {
  const v = await api<{ jeton: string; oyuncu: Oyuncu }>('/api/mobil/misafir', { govde: {} });
  await jetonYaz({ tur: 'misafir', deger: v.jeton });
  return v.oyuncu;
}

export function OturumSaglayici({ children }: { children: React.ReactNode }) {
  const [oyuncu, setOyuncu] = useState<Oyuncu | null>(null);
  const [hazir, setHazir] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const baslat = useCallback(async () => {
    setHata(null);
    try {
      if (!(await jetonOku())) { setOyuncu(await misafirAl()); return; }
      const o = await api<{ oyuncu: Oyuncu | null }>('/api/ozet');
      // Jeton geçersizse (oturum kapandı, misafir silindi) yeni misafir al
      setOyuncu(o.oyuncu ?? (await jetonYaz(null), await misafirAl()));
    } catch (e) {
      setHata(e instanceof ApiHatasi ? e.message : 'Sunucuya bağlanılamadı.');
    } finally {
      setHazir(true);
    }
  }, []);

  useEffect(() => { void baslat(); }, [baslat]);

  const deger = useMemo<OturumDegeri>(() => ({
    oyuncu, hazir, hata, yeniden: baslat,
    giris: async (kimlik, sifre) => {
      const v = await api<{ jeton: string; aktarilan: number; oyuncu: Oyuncu }>('/api/giris', { govde: { kimlik, sifre, aktar: true } });
      await jetonYaz({ tur: 'uye', deger: v.jeton });
      setOyuncu(v.oyuncu);
      return v.aktarilan;
    },
    kayit: async (g) => {
      const v = await api<{ jeton: string; aktarilan: number; oyuncu: Oyuncu }>('/api/kayit', { govde: g });
      await jetonYaz({ tur: 'uye', deger: v.jeton });
      setOyuncu(v.oyuncu);
      return v.aktarilan;
    },
    cikis: async () => {
      await api('/api/cikis', { govde: {} }).catch(() => undefined);
      await jetonYaz(null);
      setOyuncu(await misafirAl());
    },
    hesapSilindi: async () => {
      await jetonYaz(null);
      setOyuncu(await misafirAl());
    },
  }), [oyuncu, hazir, hata, baslat]);

  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>;
}

export function useOturum(): OturumDegeri {
  const b = useContext(Baglam);
  if (!b) throw new Error('OturumSaglayici eksik');
  return b;
}
