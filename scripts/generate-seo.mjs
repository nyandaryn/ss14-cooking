import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(resolve(root, 'src/seo.json')));
const publicDir = resolve(root, 'public');
const template = readFileSync(resolve(publicDir, 'index.html'), 'utf8');
const index = JSON.parse(readFileSync(resolve(publicDir, 'data/index.json')));
const fork = index.find(f => f.default) ?? index[0];
const lang = fork.hashes.ru ? 'ru' : Object.keys(fork.hashes)[0];
const data = JSON.parse(readFileSync(resolve(publicDir, `data/data_${fork.id}.${lang}.${fork.hashes[lang]}.json`)));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const href = path => config.origin + path;
const pageUrl = path => href(path === '/' ? '/' : path + '/');
const refNames = new Map([...data.entities, ...data.reagents].map(v => [v.id, v.name]));
const reagentLink = ref => `<a href="${data.catalog.drinks.includes(ref.id) ? '/drinks' : data.catalog.botanical.includes(ref.id) ? '/botany' : '/medicine'}?view=chemistry&amp;reagent=${encodeURIComponent(ref.id)}">${esc(ref.name)}</a>`;
const entityLink = ref => `<a href="/reference?entity=${encodeURIComponent(ref.id)}">${esc(ref.name)}</a>`;
const recipe = r => `<article><h2>${esc(refNames.get(r.solidResult ?? r.reagentResult) ?? r.id)}</h2><p>${esc(r.id)}</p><ul>${Object.entries(r.solids).map(([id, amount]) => `<li>${esc(refNames.get(id) ?? id)}: ${amount} шт.</li>`).join('')}${Object.entries(r.reagents).map(([id, v]) => `<li>${esc(refNames.get(id) ?? id)}: ${v.amount} u${v.catalyst ? ' (катализатор)' : ''}</li>`).join('')}</ul></article>`;
const chemistry = ids => ids.map(id => {
  const reagent = data.catalog.reagents.find(r => r.id === id);
  const reactions = data.catalog.reactions.filter(r => r.products.some(p => p.reagent.id === id));
  return `<article><h2>${esc(reagent.name)}</h2><p>${esc(id)} — ${esc(reagent.description)}</p>${reactions.map(r => `<h3>Синтез ${esc(r.id)}</h3><ul>${r.reactants.map(v => `<li>${reagentLink(v.reagent)}: ${v.amount} u${v.catalyst ? ' (катализатор, не расходуется)' : ''}</li>`).join('')}</ul><p>Результат: ${r.products.map(v => `${reagentLink(v.reagent)}: ${v.amount} u`).join(', ')}</p>${r.minTemp != null ? `<p>Минимальная температура: ${r.minTemp} K</p>` : ''}${r.maxTemp != null ? `<p>Максимальная температура: ${r.maxTemp} K</p>` : ''}${r.mixers.length ? `<p>Смешиватель: ${esc(r.mixers.join(', '))}</p>` : ''}`).join('') || '<p>Рецепт синтеза в сборке не найден.</p>'}</article>`;
}).join('');
const medical = r => r.method === 'microwave' && [r.subtype].flat().includes('MedicalAssembler');
const content = {
  '/production': () => (data.catalog.manufacturing ?? []).map(r => `<article><h2>${esc(r.result.name)}</h2><p>${r.materials.map(m => `${esc(m.material.name)}: ${m.amount}`).join(', ')}</p><p>${r.machines.map(m => `${esc(m.machine.name)} (${esc(m.access)})`).join(', ')}</p>${r.entityResult ? entityLink(r.result) : (r.reagentResults ?? []).map(p => reagentLink(p.reagent)).join(', ')}</article>`).join(''),
  '/': () => data.recipes.filter(r => !medical(r)).map(recipe).join(''),
  '/drinks': () => chemistry(data.catalog.drinks),
  '/medicine': () => chemistry(data.catalog.medicine) + '<h2>Мед-о-мат</h2>' + data.recipes.filter(medical).map(recipe).join(''),
  '/botany': () => '<p>Базовые параметры до мутаций и скрещивания. Время указано в циклах роста.</p>' + data.catalog.plants.map(p => `<article><h2>${esc(p.name)}</h2><p>${esc(p.id)}</p><p>Продукты: ${p.products.map(entityLink).join(', ') || 'нет'}. Семена: ${esc(p.seed?.name ?? 'не указаны')}.</p><p>Сбор: ${esc(({NoRepeat: 'одноразовый, растение исчезает после сбора', Repeat: 'многоразовый, растение остаётся после сбора', SelfHarvest: 'автоматический сброс урожая'})[p.harvest] ?? p.harvest)}. ${p.tool ? `Инструмент: ${esc(p.tool)}` : 'Сбор пустой рукой с созревшего растения или грядки'}.</p><p>Урожайность: ${p.yield}; потенция: ${p.potency}; созревание: ${p.maturation}; производство: ${p.production}; срок жизни: ${p.lifespan}.</p><p>Мутации: ${p.mutations.map(v => `<a href="/botany?plant=${encodeURIComponent(v.id)}">${esc(v.name)}</a>`).join(', ') || 'нет'}.</p><p>Состав урожая: ${p.chemicals.map(v => `${reagentLink(v.reagent)} ≈ ${Number(v.amount.toFixed(2))} u`).join(', ') || 'не указан'}.</p></article>`).join('') + '<h2>Удобрения и ботаническая химия</h2>' + chemistry(data.catalog.botanical),
  '/combinations': () => Object.entries(data.foodSequenceStartPoints).map(([key, ids]) => `<article><h2>${ids.map(id => esc(refNames.get(id) ?? id)).join(', ')}</h2><p>Ингредиенты: ${(data.foodSequenceElements[key] ?? []).map(id => esc(refNames.get(id) ?? id)).join(', ')}</p></article>`).join(''),
};
const navigation = `<nav aria-label="Разделы">${Object.entries(config.pages).map(([path, p]) => `<a href="${path}">${esc(p.heading)}</a>`).join(' · ')}</nav>`;
for (const [path, page] of Object.entries(config.pages)) {
  const canonical = pageUrl(path);
  const graph = {'@context':'https://schema.org', '@graph': [
    {'@type':'WebSite', '@id':href('/#website'), url:href('/'), name:config.siteName, inLanguage:['ru','en']},
    {'@type':'CollectionPage', '@id':canonical+'#webpage', url:canonical, name:page.title, description:page.description, inLanguage:lang, isPartOf:{'@id':href('/#website')}, about:{'@type':'VideoGame', name:'Space Station 14'}, ...(path !== '/' ? {breadcrumb:{'@id':canonical+'#breadcrumbs'}} : {})},
    ...(path !== '/' ? [{'@type':'BreadcrumbList', '@id':canonical+'#breadcrumbs', itemListElement:[{'@type':'ListItem',position:1,name:config.siteName,item:href('/')},{'@type':'ListItem',position:2,name:page.heading,item:canonical}]}] : [])
  ]};
  const head = `<!-- SEO:START -->
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="theme-color" content="#1a1a1a">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(config.siteName)}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="ru_RU">
<meta property="og:image" content="${href(config.image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="SS14 Lust Station — кулинария, медицина и ботаника">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${href(config.image)}">
<meta name="twitter:image:alt" content="SS14 Lust Station — кулинария, медицина и ботаника">
<script type="application/ld+json" id="seo-schema">${json(graph)}</script>
<!-- SEO:END -->`;
  const html = template.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`)
    .replace(/<script type="application\/json" id="fork-index">[\s\S]*?<\/script>/, () => `<script type="application/json" id="fork-index">${json(index)}</script>`)
    .replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/, head)
    .replace(/<div class="app-root" id="app-root">[\s\S]*?<\/div><!-- APP:END -->/, `<div class="app-root" id="app-root">${navigation}<main><h1>${esc(page.heading)}</h1><p>${esc(page.description)}</p>${content[path]()}</main></div><!-- APP:END -->`);
  const dest = path === '/' ? publicDir : resolve(publicDir, path.slice(1));
  mkdirSync(dest, {recursive:true});
  writeFileSync(resolve(dest, 'index.html'), html);
}
writeFileSync(resolve(publicDir,'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${href('/sitemap.xml')}\n`);
writeFileSync(resolve(publicDir,'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(config.pages).map(path => `<url><loc>${pageUrl(path)}</loc></url>`).join('')}</urlset>\n`);
writeFileSync(resolve(publicDir,'_headers'), '/menu\n  X-Robots-Tag: noindex, follow\n/menu/*\n  X-Robots-Tag: noindex, follow\n/migrate\n  X-Robots-Tag: noindex, follow\n');
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#1a1a1a"/><rect x="70" y="70" width="8" height="490" fill="#72b98b"/><g font-family="sans-serif" fill="white"><text x="115" y="155" font-size="28" fill="#72b98b">LUST STATION / SPACE STATION 14</text><text x="110" y="290" font-size="94" font-weight="bold">SS14</text><text x="115" y="385" font-size="48">Рецепты и справочники</text><text x="115" y="470" font-size="27" fill="#dddddd">Кулинария · Напитки · Медицина · Ботаника</text><text x="115" y="545" font-size="24" fill="#aaaaaa">ss14-cooking.pages.dev</text></g></svg>`)).png().toFile(resolve(publicDir,'img/seo-card.png'));
console.log(`SEO: ${Object.keys(config.pages).length} static pages, sitemap, robots.txt, social image`);

// Generate discovery documents from the published index so hashed data links
// always point at the same snapshots as the application.
const entries = index.flatMap(build => Object.entries(build.hashes).map(([language, hash]) => {
  const name = build.name[language] ?? Object.values(build.name)[0];
  return {
    identifier: `urn:air:${new URL(config.origin).hostname}:catalog:${build.id}:${language}`,
    displayName: `SS14 ${name} game catalog (${language})`,
    description: 'Read-only game data: cooking and drink recipes, medicine synthesis, plants, mutations and harvests. This is a JSON dataset, not a callable agent or medical advice.',
    type: 'application/json',
    url: href(`/data/data_${build.id}.${language}.${hash}.json`),
    representativeQueries: [
      `What ingredients make a recipe in SS14 ${name}?`,
      `Which plants and mutations are available in SS14 ${name}?`,
      `How are medicines synthesized in SS14 ${name}?`,
    ],
  };
}));
mkdirSync(resolve(publicDir, '.well-known'), { recursive: true });
writeFileSync(resolve(publicDir, '.well-known/ard.json'), JSON.stringify({ entries }, null, 2) + '\n');
writeFileSync(resolve(publicDir, 'llms.txt'), `# SS14 Cookbook — Lust Station and WizDen

> A reference for Space Station 14 game recipes, chemistry and botany, with separate Lust Station and WizDen catalogs.

Lust Station is the default build. Select WizDen with ?fork=wizden. Interface languages are Russian and English; official WizDen game names are English. These are game mechanics, not real-world cooking or medical instructions.

The JSON datasets contain recipes, entities, reagents and a department catalog. Plant growth times are game cycles, not seconds. Plant stats describe base prototypes before mutation or crossbreeding. Never mix data from different builds. Use the index to discover current data URLs and source commits; filenames change when data changes.

## Sections

- [Cooking](${href('/')}): Ingredients and preparation recipes.
- [Drinks](${pageUrl('/drinks')}): Cocktails, ratios, mixing requirements and ingredient sources.
- [Medicine](${pageUrl('/medicine')}): Synthesis, catalysts and temperature requirements.
- [Production and vending machines](${pageUrl('/production')}): Materials, machines, unlocks, hacked recipes and item sources.
- [Botany](${pageUrl('/botany')}): Plants, species mutations, produce and harvest methods.
- [WizDen](${href('/?fork=wizden')}): Original Wizard's Den build.

## Machine-readable data

- [Build index](${href('/data/index.json')}): Current build IDs, languages, data hashes and source commits.
${entries.map(entry => `- [${entry.displayName}](${entry.url}): Complete generated catalog for this build and language.`).join('\n')}
- [ARD manifest](${href('/.well-known/ard.json')}): Discovery metadata for the JSON datasets.

## Optional

- [Sitemap](${href('/sitemap.xml')}): Indexable section pages.
- [Lust Station source](https://github.com/makura-games/lust-station): Game source repository.
- [WizDen source](https://github.com/space-wizards/space-station-14): Game source repository.
`);
console.log(`Discovery: llms.txt and ARD manifest with ${entries.length} data resources`);
