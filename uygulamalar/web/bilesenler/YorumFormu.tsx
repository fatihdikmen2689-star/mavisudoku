'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function YorumFormu({ bulmacaId }: { bulmacaId: number }) {
  const [metin, setMetin] = useState('');
  const [durum, setDurum] = useState<{ tur: 'hata' | 'tamam' | 'bilgi'; mesaj: string } | null>(null);
  const [bekle, setBekle] = useState(false);
  const router = useRouter();
  return (
    <form className="form" onSubmit={async (e) => {
      e.preventDefault();
      if (metin.trim().length < 2) { setDurum({ tur: 'hata', mesaj: 'Bir şeyler yaz.' }); return; }
      setBekle(true);
      try {
        const r = await fetch(`/api/bulmaca/${bulmacaId}/yorum`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metin }) });
        const v = await r.json();
        if (!r.ok) setDurum({ tur: 'hata', mesaj: v.hata });
        else {
          setMetin('');
          setDurum(v.durum === 'yayinda' ? { tur: 'tamam', mesaj: 'Yorumun yayınlandı.' } : { tur: 'bilgi', mesaj: 'Yorumun moderatör onayından sonra herkese görünecek.' });
          router.refresh();
        }
      } catch {
        setDurum({ tur: 'hata', mesaj: 'Bağlantı sorunu, tekrar dene.' });
      } finally {
        setBekle(false);
      }
    }}>
      <div className="alan">
        <label htmlFor="yorum-metin">Yorumun</label>
        <textarea id="yorum-metin" className="yorum-giris" maxLength={500} value={metin} onChange={(e) => { setMetin(e.target.value); setDurum(null); }} placeholder="Bu bulmacayı nasıl çözdün? Taktiğini paylaş." />
        <p className="ipucu">{metin.length}/500 · Küfür, hakaret ve kişisel bilgi içeren yorumlar yayınlanmaz.</p>
        {durum && <p className={durum.tur === 'hata' ? 'hata' : 'iyi'} role="status">{durum.mesaj}</p>}
      </div>
      <div><button type="submit" className="btn-mavi" style={{ minHeight: 44 }} disabled={bekle}>{bekle ? 'Gönderiliyor…' : 'Yorumu gönder'}</button></div>
    </form>
  );
}
