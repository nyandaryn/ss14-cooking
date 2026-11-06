import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const read = file => readFileSync(new URL('../public/' + file, import.meta.url), 'utf8');
const config = JSON.parse(readFileSync(new URL('../src/seo.json', import.meta.url)));
const sitemap = read('sitemap.xml');
const pageUrl = path => config.origin + (path === '/' ? '/' : path + '/');
for (const [path, page] of Object.entries(config.pages)) {
  test(`SEO HTML ${path}`, () => {
    const html = read(path === '/' ? 'index.html' : path.slice(1) + '/index.html');
    const embeddedIndex = JSON.parse(html.match(/<script type="application\/json" id="fork-index">([\s\S]*?)<\/script>/)[1]);
    assert.deepEqual(embeddedIndex, JSON.parse(read('data/index.json')), 'Initial catalog index must match published data');
    assert.equal((html.match(/<title>/g) ?? []).length, 1);
    assert.ok(html.includes(`<title>${page.title}</title>`));
    assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
    assert.ok(html.includes(`rel="canonical" href="${pageUrl(path)}"`));
    assert.ok(html.includes('name="robots" content="index,follow'));
    assert.ok(html.includes('property="og:image:width" content="1200"'));
    assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
    assert.ok(html.includes(`<h1>${page.heading}</h1>`));
    assert.ok((html.match(/<article>/g) ?? []).length > 0, 'Catalog content must exist without JavaScript');
    assert.ok(html.includes('href="/medicine"') && html.includes('href="/botany"'));
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json" id="seo-schema">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema['@graph'].find(v => v['@type'] === 'CollectionPage').url, pageUrl(path));
    assert.ok(sitemap.includes(`<loc>${pageUrl(path)}</loc>`));
  });
}
test('Static catalog contains actual game data', () => {
  assert.ok(read('botany/index.html').includes('WheatPlants'));
  assert.ok(read('botany/index.html').includes('многоразовый'));
  assert.ok(read('medicine/index.html').includes('Bicaridine'));
});
test('Crawl controls and preview image', () => {
  assert.ok(read('robots.txt').includes(`Sitemap: ${config.origin}/sitemap.xml`));
  assert.ok(!read('robots.txt').includes('Disallow: /'));
  assert.ok(read('_headers').includes('/menu/*\n  X-Robots-Tag: noindex, follow'));
  assert.ok(!sitemap.includes('/menu') && !sitemap.includes('/migrate'));
  const png = readFileSync(new URL('../public' + config.image, import.meta.url));
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

test('Agent discovery documents are real Markdown/JSON with existing data links', () => {
  const llms = read('llms.txt');
  assert.match(llms, /^# .+/);
  assert.match(llms, /\[[^\]]+\]\(https:\/\//);
  const manifest = JSON.parse(read('.well-known/ard.json'));
  assert.ok(manifest.entries.length >= 2);
  assert.equal(new Set(manifest.entries.map(e => e.identifier)).size, manifest.entries.length);
  for (const entry of manifest.entries) {
    assert.match(entry.identifier, /^urn:air:ss14-cooking\.pages\.dev:/);
    assert.ok(entry.displayName);
    assert.equal(entry.type, 'application/json');
    assert.ok(entry.representativeQueries.length >= 2);
    assert.equal(new URL(entry.url).origin, config.origin);
    assert.ok(JSON.parse(read(new URL(entry.url).pathname.slice(1))).recipes.length > 0);
    assert.ok(llms.includes(entry.url));
  }
  assert.ok(read('index.html').includes('rel="ard"'));
});
test('Site metadata and medicine crawl content reflect the complete reference', () => {
  assert.match(config.siteName, /Справочник SS14/);
  for (const section of ['лекарства', 'химия', 'растения', 'автолаты', 'вендоматы']) assert.ok(config.pages['/'].description.includes(section));
  assert.match(config.pages['/'].description, /Lust Station и WizDen/);
  assert.ok(read('medicine/index.html').includes('Desoxyephedrine'));
  assert.ok(read('medicine/index.html').includes('FoamingAgent'));
  assert.ok(read('index.html').includes(config.image));
});
