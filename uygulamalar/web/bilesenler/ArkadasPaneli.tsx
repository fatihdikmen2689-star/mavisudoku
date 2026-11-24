'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SEVIYE_SIRASI } from '@mavisudoku/motor';
import type { SeviyeId } from '@mavisudoku/motor';
import type { MacListesi } from '../sunucu/mac.ts';
import { SEVIYE_UI } from '../lib/bicim.ts';

const SONUC_ADI = { kazandin: 'Kazandın', kaybettin: 'Kaybettin', 'zaman-asimi': 'Süre doldu', devam: 'Devam ediyor' } as const;
const dakika = (sn: number) => `${Math.floor(sn / 60)}:${String(sn % 60).padStart(2, '0')}`;

export function ArkadasPaneli({ ilk, rakip: onerilen }: { ilk: MacListesi; rakip?: string }) {
  const [liste, setListe] = useState(ilk);
  const [rakip, setRakip] = useState(onerilen ?? '');
  const [seviye, setSeviye] = useState<SeviyeId>('kolay');
  const [mesaj, setMesaj] = useState<{ tur: 'hata' | 'iyi'; metin: string } | null>(null);
  const [bekle, setBekle] = useState(false);
  const router = useRouter();
  const gidenler = useRef(new Set(ilk.giden.map((g) => g.macId)));

  // Davetleri izle; gönderdiğim davet kabul edilince maça geç
  useEffect(() => {
    let iptal = false;
    let t: ReturnType<typeof setTimeout>;
    const sor = async () => {
      try {
        const r = await fetch('/api/mac', { cache: 'no-store' });
        if (r.ok) {
          const v: MacListesi = await r.json();
          if (iptal) return;
          const baslayan = v.maclar.find((m) => m.sonuc === 'devam' && gidenler.current.has(m.macId));
          if (baslayan) { router.push(`/mac/${baslayan.macId}`); return; }
          gidenler.current = new Set(v.giden.map((g) => g.macId));
          setListe(v);
        }
      } catch { /* bir sonraki denemede */ }
      if (!iptal) t = setTimeout(sor, document.hidden ? 8000 : 3000);
    };
    t = setTimeout(sor, 3000);
    return () => { iptal = true; clearTimeout(t); };
  }, [router]);

  // Bekleyen davetlerin kalan süresi her saniye azalır
  useEffect(() => {
    const t = setInterval(() => setListe((l) => ({
      ...l,
      gelen: l.gelen.map((d) => ({ ...d, kalanSaniye: Math.max(0, d.kalanSaniye - 1) })).filter((d) => d.kalanSaniye > 0),
      giden: l.giden.map((d) => ({ ...d, kalanSaniye: Math.max(0, d.kalanSaniye - 1) })).filter((d) => d.kalanSaniye > 0),
    })), 1000);
    return () => clearInterval(t);
  }, []);

  const istek = async (url: string, govde: object) => {
    setBekle(true);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde) });
      const v = await r.json();
      if (!r.ok) { setMesaj({ tur: 'hata', metin: v.hata ?? 'İşlem yapılamadı.' }); return null; }
      return v;
    } catch {
      setMesaj({ tur: 'hata', metin: 'Bağlantı sorunu, tekrar dene.' });
      return null;
    } finally {
      setBekle(false);
    }
  };
  const yenile = async () => { const r = await fetch('/api/mac', { cache: 'no-store' }); if (r.ok) setListe(await r.json()); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section className="kart" aria-labelledby="davet-b">
        <h2 id="davet-b">Arkadaşını davet et</h2>
        <p className="kart-alt">İkiniz de aynı bulmacayı aynı anda kendi ekranınızda çözersiniz. Rakibinin ilerlemesini canlı görürsün; ilk bitiren kazanır.</p>
        <form className="form" onSubmit={async (e) => {
          e.preventDefault();
          setMesaj(null);
          const v = await istek('/api/mac', { rakip, seviye });
          if (v) {
            gidenler.current.add(v.macId);
            setMesaj({ tur: 'iyi', metin: `Davet gönderildi. ${rakip.replace(/^@/, '')} kabul edince maç kendiliğinden başlar; bu sayfada bekle.` });
            setRakip('');
            await yenile();
          }
        }}>
          <div className="ikili">
            <div className="alan">
              <label htmlFor="a-rakip">Arkadaşının rumuzu</label>
              <input id="a-rakip" value={rakip} onChange={(e) => { setRakip(e.target.value); setMesaj(null); }} autoCapitalize="none" spellCheck={false} placeholder="ör. ayse_yilmaz" required />
            </div>
            <div className="alan">
              <label htmlFor="a-seviye">Seviye</label>
              <select id="a-seviye" value={seviye} onChange={(e) => setSeviye(e.target.value as SeviyeId)}>
                {SEVIYE_SIRASI.map((s) => <option key={s} value={s}>{SEVIYE_UI[s].ad}</option>)}
              </select>
            </div>
          </div>
          {mesaj && <p className={mesaj.tur === 'hata' ? 'uyari' : 'bilgi'} role="status" style={{ margin: 0 }}>{mesaj.metin}</p>}
          <div><button type="submit" className="btn-mavi" style={{ minHeight: 46, padding: '0 22px', fontSize: 15 }} disabled={bekle || !rakip.trim()}>Davet gönder</button></div>
        </form>
      </section>

      {liste.gelen.length > 0 && (
        <section className="kart" aria-labelledby="gelen-b">
          <h2 id="gelen-b">Gelen davetler</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {liste.gelen.map((d) => (
              <div key={d.macId} className="mac-satir">
                <span className="ad">{d.rumuz}</span>
                <span className="ek">{SEVIYE_UI[d.seviye].ad} · {dakika(d.kalanSaniye)} içinde yanıtla</span>
                <button type="button" className="btn-mavi" disabled={bekle} onClick={async () => { if (await istek(`/api/mac/${d.macId}/yanit`, { kabul: true })) router.push(`/mac/${d.macId}`); }}>Kabul et</button>
                <button type="button" className="ikincil-btn" disabled={bekle} onClick={async () => { if (await istek(`/api/mac/${d.macId}/yanit`, { kabul: false })) await yenile(); }}>Reddet</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {liste.giden.length > 0 && (
        <section className="kart" aria-labelledby="giden-b">
          <h2 id="giden-b">Gönderdiğin davetler</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {liste.giden.map((d) => (
              <div key={d.macId} className="mac-satir">
                <span className="ad">{d.rumuz}</span>
                <span className="ek">{SEVIYE_UI[d.seviye].ad} · yanıt bekleniyor · {dakika(d.kalanSaniye)}</span>
                <button type="button" className="ikincil-btn" disabled={bekle} onClick={async () => { if (await istek(`/api/mac/${d.macId}/iptal`, {})) await yenile(); }}>İptal et</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="kart" aria-labelledby="son-b">
        <h2 id="son-b">Son maçların</h2>
        {liste.maclar.length === 0 ? <p style={{ margin: 0, color: 'var(--soluk)' }}>Henüz maç yapmadın. İlk daveti gönder!</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {liste.maclar.map((m) => (
              <div key={m.macId} className="mac-satir">
                <span className="ad">{m.rakip}</span>
                <span className="ek">{SEVIYE_UI[m.seviye].ad} · {new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(m.tarih))}</span>
                <span className={`sonuc-etiket ${m.sonuc === 'kazandin' || m.sonuc === 'kaybettin' ? m.sonuc : 'notr'}`}>{SONUC_ADI[m.sonuc ?? 'devam']}</span>
                {m.sonuc === 'devam'
                  ? <Link className="btn-mavi" href={`/mac/${m.macId}`}>Maça dön</Link>
                  : <button type="button" className="ikincil-btn" disabled={bekle} onClick={() => { setRakip(m.rakip); setSeviye(m.seviye); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Rövanş</button>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
