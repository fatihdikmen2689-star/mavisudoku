import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const site = process.env.SITE_URL ?? 'https://mavisudoku.com';
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/giris', '/kayit', '/profil'] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
