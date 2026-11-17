import { SITE } from '@/lib/site';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/agent', '/join-agent', '/reset-password', '/confirm-email'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
