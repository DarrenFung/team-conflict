const fs = require('fs');
const path = require('path');

const API_BASE = 'https://cmsapi.health811.ontario.ca/api/conditions';
const TOKEN = 'website-service-account-token';
const ARTICLES_DIR = path.join(__dirname, '.articles');
const CONCURRENCY = 20;

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 120);
}

async function fetchCondition(article, index, total) {
  const conditionName = decodeURIComponent(
    article.url.split('name=')[1] || ''
  );

  const params = new URLSearchParams({
    'token': TOKEN,
    'filters[commonName][$eqi]': conditionName,
    'populate[0]': 'overview',
    'populate[1]': 'risks',
    'populate[2]': 'symptoms',
    'populate[3]': 'diagnosis',
    'populate[4]': 'treatment',
    'populate[5]': 'prevention',
    'populate[6]': 'prognosis',
    'populate[7]': 'synonyms',
    'populate[8]': 'acronyms',
    'populate[9]': 'associatedTerms',
    'locale[0]': 'en-CA',
  });

  const url = `${API_BASE}?${params.toString()}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();

    if (!json.data || json.data.length === 0) {
      throw new Error('No data returned');
    }

    const condition = json.data[0].attributes;

    // Build markdown - capitalize title
    const title = article.title; // Use the display title from the index
    let md = `# ${title}\n\n`;

    // Collect all alternate names: synonyms, acronyms, associated terms
    const altNames = [
      ...(condition.synonyms || []).map(s => s.term),
      ...(condition.acronyms || []).map(s => s.term),
      ...(condition.associatedTerms || []).map(s => s.term),
    ].filter(Boolean);

    if (altNames.length > 0) {
      md += `*Also known as ${altNames.join(', ')}*\n\n`;
    }

    md += `**Source:** [Health811 Ontario](${article.url})\n`;

    const updated = condition.updatedAt ? new Date(condition.updatedAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const created = condition.createdAt ? new Date(condition.createdAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    if (updated) md += `**Updated:** ${updated}\n`;
    if (created) md += `**Published:** ${created}\n`;

    md += '\n---\n\n';

    // Sections
    const sections = ['overview', 'risks', 'symptoms', 'diagnosis', 'treatment', 'prevention', 'prognosis'];
    for (const section of sections) {
      if (condition[section] && condition[section].text) {
        const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1);
        md += `## ${sectionTitle}\n\n${condition[section].text}\n\n`;
      }
    }

    const slug = slugify(article.title);
    const filePath = path.join(ARTICLES_DIR, `${slug}.md`);
    fs.writeFileSync(filePath, md.trim() + '\n');

    console.log(`[${index + 1}/${total}] ✓ ${article.title}`);
    return { success: true, title: article.title, slug };
  } catch (err) {
    console.error(`[${index + 1}/${total}] ✗ ${article.title}: ${err.message}`);
    return { success: false, title: article.title, url: article.url, error: err.message };
  }
}

async function main() {
  const articles = JSON.parse(fs.readFileSync(path.join(__dirname, 'article-index.json'), 'utf-8'));
  console.log(`Total articles: ${articles.length}`);

  if (!fs.existsSync(ARTICLES_DIR)) {
    fs.mkdirSync(ARTICLES_DIR, { recursive: true });
  }

  // Check existing
  const existing = new Set(fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md')));
  const toScrape = articles.filter(a => !existing.has(`${slugify(a.title)}.md`));
  console.log(`Already scraped: ${existing.size}, remaining: ${toScrape.length}`);

  const results = [];
  const failures = [];

  for (let i = 0; i < toScrape.length; i += CONCURRENCY) {
    const batch = toScrape.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((article, j) => fetchCondition(article, i + j, toScrape.length))
    );
    results.push(...batchResults);
    failures.push(...batchResults.filter(r => !r.success));

    if ((i + CONCURRENCY) % 100 < CONCURRENCY) {
      console.log(`--- Progress: ${results.filter(r => r.success).length}/${toScrape.length} scraped, ${failures.length} failed ---`);
    }
  }

  console.log(`\nDone! Scraped ${results.filter(r => r.success).length} articles.`);
  if (failures.length > 0) {
    console.log(`Failed: ${failures.length}`);
    fs.writeFileSync(path.join(__dirname, 'failures.json'), JSON.stringify(failures, null, 2));
    console.log('Failures saved to failures.json');
  }
}

main().catch(console.error);
