import { ADSENSE_ISTEMCI } from '../../lib/reklam.ts';

/** AdSense yetkili satıcı dosyası (ads.txt); yayıncı kimliği girilince otomatik oluşur */
export function GET() {
  if (!ADSENSE_ISTEMCI) return new Response('', { status: 404 });
  return new Response(`google.com, ${ADSENSE_ISTEMCI.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
