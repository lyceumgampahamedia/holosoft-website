import fs from 'node:fs/promises';
import path from 'node:path';

const api = String(process.env.VITE_API_URL || '').replace(/\/$/, '');
const site = String(process.env.VITE_WEBSITE_URL || '').replace(/\/$/, '');
const dist = path.resolve('apps/website/dist');

if (!site) {
  console.log('VITE_WEBSITE_URL missing; skipping SEO artifact generation.');
  process.exit(0);
}

const xmlEscape = (value='') => String(value)
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'","&apos;");

const routeUrl = (route='') => new URL(String(route).replace(/^\//,''), `${site}/`).href;
const urls = new Set([routeUrl('')]);

if (api) {
  try {
    const response = await fetch(`${api}/api/content`, { headers:{ accept:'application/json' } });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const content = await response.json();
    for (const page of content.pages || []) {
      if (page?.published !== false && page?.slug) urls.add(routeUrl(page.slug));
    }
    for (const project of content.projects || []) {
      if (project?.published !== false && project?.caseStudyEnabled !== false && (project?.slug || project?.id)) {
        urls.add(routeUrl(`work/${project.slug || project.id}`));
      }
    }
  } catch (error) {
    console.warn('Could not fetch live content for sitemap:', error.message);
  }
}

const now = new Date().toISOString().slice(0,10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...urls].map((url) => `  <url><loc>${xmlEscape(url)}</loc><lastmod>${now}</lastmod></url>`).join('\n')}
</urlset>
`;
const robots = `User-agent: *
Allow: /
Disallow: /cms/
Sitemap: ${routeUrl('sitemap.xml')}
`;

await fs.writeFile(path.join(dist,'sitemap.xml'), sitemap);
await fs.writeFile(path.join(dist,'robots.txt'), robots);
console.log(`Generated sitemap with ${urls.size} URLs.`);
