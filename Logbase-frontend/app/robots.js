import { SITE } from '@/lib/site';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/reset-password', '/confirm-email'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
