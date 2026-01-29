import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/share/'],
    },
    sitemap: 'https://taskello.app/sitemap.xml',
    host: 'https://taskello.app',
  };
}
