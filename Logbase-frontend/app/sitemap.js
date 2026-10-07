import { SITE } from '@/lib/site';

export default function sitemap() {
  return ['', '/terms', '/privacy', '/refund-policy', '/contact'].map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: new Date(),
  }));
}
