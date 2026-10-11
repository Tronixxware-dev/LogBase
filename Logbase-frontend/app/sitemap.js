import { SITE } from '@/lib/site';
import { GUIDES } from '@/lib/guides';

export default function sitemap() {
  const paths = ['', '/guides', ...GUIDES.map((g) => `/guides/${g.slug}`), '/terms', '/privacy', '/refund-policy', '/contact'];
  return paths.map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: new Date(),
  }));
}
