import type { NextConfig } from 'next';

const ayar: NextConfig = {
  transpilePackages: ['@mavisudoku/motor'],
  serverExternalPackages: ['@electric-sql/pglite', 'pg', 'pdf-lib', '@pdf-lib/fontkit'],
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:yol*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ],
    }];
  },
};
export default ayar;
