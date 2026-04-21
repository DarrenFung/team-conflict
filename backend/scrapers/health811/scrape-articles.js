const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CONCURRENCY = 10;
const ARTICLES_DIR = path.join(__dirname, '.articles');

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 120);
}

function innerTextToMarkdown(text, articleUrl) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let md = '';
  let title = '';
  let alsoKnown = '';
  let inTOC = false;
  let skipFeedback = false;
  let updated = '';
  let published = '';

  // Known section headings that appear as H2s on the page
  const sectionHeadings = new Set([
    'Overview', 'Risks', 'Symptoms', 'Diagnosis', 'Treatment',
    'Prevention', 'Prognosis', 'Causes', 'Complications',
    'Other names', 'Types', 'When to seek immediate medical care',
    'When to make a doctor\'s appointment', 'Self-care',
  ]);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // First non-empty line is the title
    if (!title) {
      title = line;
      continue;
    }

    // "Also known as" line
    if (line.startsWith('Also known as')) {
      alsoKnown = line;
      continue;
    }

    // Skip "On this page" TOC section
    if (line === 'On this page') {
      inTOC = true;
      continue;
    }
    if (inTOC) {
      // TOC items are the same as section headings - skip until we hit actual content
      if (sectionHeadings.has(line) && i + 1 < lines.length && sectionHeadings.has(lines[i + 1])) {
        continue;
      }
      // Once we hit a heading followed by non-heading content, TOC is over
      inTOC = false;
    }

    // Skip feedback section at bottom
    if (line === 'This page gave me the information I was looking for.') {
      skipFeedback = true;
      continue;
    }
    if (skipFeedback) continue;

    // Dates
    if (line.startsWith('Updated:')) {
      updated = line.replace('Updated:', '').trim();
      continue;
    }
    if (line.startsWith('Published:')) {
      published = line.replace('Published:', '').trim();
      continue;
    }

    // Section headings
    if (sectionHeadings.has(line)) {
      md += `\n## ${line}\n\n`;
      continue;
    }

    // Regular content
    md += line + '\n\n';
  }

  // Build final document
  let doc = `# ${title}\n\n`;
  if (alsoKnown) doc += `*${alsoKnown}*\n\n`;
  doc += `**Source:** [Health811 Ontario](${articleUrl})\n`;
  if (updated) doc += `**Updated:** ${updated}\n`;
  if (published) doc += `**Published:** ${published}\n`;
  doc += '\n---\n';
  doc += md;

  return doc.trim() + '\n';
}

async function scrapeArticle(browser, article, index, total) {
  const page = await browser.newPage();
  try {
    await page.goto(article.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for the article content to actually render (h2 sections appear)
    await page.waitForSelector('h2', { timeout: 15000 });
    // Give a bit more time for remaining content
    await page.waitForTimeout(1000);

    const fullText = await page.evaluate(() => {
      const main = document.querySelector('main') || document.querySelector('#main') || document.body;
      return main.innerText;
    });

    if (!fullText || fullText.trim().length < 50) {
      throw new Error(`No content extracted (got ${fullText?.length || 0} chars)`);
    }

    const md = innerTextToMarkdown(fullText, article.url);
    const slug = slugify(article.title);
    const filePath = path.join(ARTICLES_DIR, `${slug}.md`);
    fs.writeFileSync(filePath, md);

    console.log(`[${index + 1}/${total}] ✓ ${article.title}`);
    return { success: true, title: article.title, slug, file: `${slug}.md` };
  } catch (err) {
    console.error(`[${index + 1}/${total}] ✗ ${article.title}: ${err.message}`);
    return { success: false, title: article.title, url: article.url, error: err.message };
  } finally {
    await page.close();
  }
}

async function main() {
  const articles = JSON.parse(fs.readFileSync(path.join(__dirname, 'article-index.json'), 'utf-8'));
  console.log(`Total articles to scrape: ${articles.length}`);

  if (!fs.existsSync(ARTICLES_DIR)) {
    fs.mkdirSync(ARTICLES_DIR, { recursive: true });
  }

  // Check for already-scraped articles (with content) to enable resuming
  const existing = new Set();
  for (const f of fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'))) {
    const content = fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf-8');
    // Only count as scraped if the file has actual content (more than just header)
    if (content.split('\n').length > 12) {
      existing.add(f);
    }
  }

  const toScrape = articles.filter(a => !existing.has(`${slugify(a.title)}.md`));
  console.log(`Already scraped: ${existing.size}, remaining: ${toScrape.length}`);

  if (toScrape.length === 0) {
    console.log('All articles already scraped!');
    return;
  }

  const browser = await chromium.launch({ headless: true });

  const results = [];
  const failures = [];

  for (let i = 0; i < toScrape.length; i += CONCURRENCY) {
    const batch = toScrape.slice(i, i + CONCURRENCY);
    const globalOffset = articles.length - toScrape.length;
    const batchResults = await Promise.all(
      batch.map((article, j) => scrapeArticle(browser, article, globalOffset + i + j, articles.length))
    );
    results.push(...batchResults);
    failures.push(...batchResults.filter(r => !r.success));

    // Progress update every 50 articles
    if ((i + CONCURRENCY) % 50 < CONCURRENCY) {
      const done = results.filter(r => r.success).length;
      console.log(`--- Progress: ${done}/${toScrape.length} scraped, ${failures.length} failed ---`);
    }
  }

  await browser.close();

  console.log(`\nDone! Scraped ${results.filter(r => r.success).length} articles.`);
  if (failures.length > 0) {
    console.log(`Failed: ${failures.length}`);
    fs.writeFileSync(path.join(__dirname, 'failures.json'), JSON.stringify(failures, null, 2));
    console.log('Failures saved to failures.json');
  }
}

main().catch(console.error);
