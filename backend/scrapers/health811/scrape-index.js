const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://health811.ontario.ca/static/guest/medical-library/';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const allArticles = [];

  for (const letter of LETTERS) {
    let azPage = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `${BASE}?search=&searchPage=1&letter=${letter}&azPage=${azPage}#searchAZFilter`;
      console.log(`Fetching: letter=${letter}, page=${azPage}`);

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Extract article links from this page
        const articles = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a.MuiCardActionArea-root'));
          return links.map(a => ({
            title: a.textContent.trim(),
            url: a.href
          }));
        });

        if (articles.length === 0) {
          console.log(`  No articles found for letter=${letter}, page=${azPage}. Stopping.`);
          hasMore = false;
          break;
        }

        console.log(`  Found ${articles.length} articles`);
        allArticles.push(...articles);

        // Check if there's a next page
        const nextPageExists = await page.evaluate((currentPage) => {
          const paginationLinks = Array.from(document.querySelectorAll('a.MuiPaginationItem-page'));
          const nextPage = paginationLinks.find(a => {
            const label = a.getAttribute('aria-label');
            return label && label.includes(`page ${currentPage + 1}`);
          });
          return !!nextPage;
        }, azPage);

        if (nextPageExists) {
          azPage++;
        } else {
          hasMore = false;
        }
      } catch (err) {
        console.error(`  Error on letter=${letter}, page=${azPage}: ${err.message}`);
        hasMore = false;
      }
    }
  }

  // Deduplicate by URL
  const seen = new Set();
  const unique = allArticles.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  console.log(`\nTotal articles collected: ${allArticles.length}`);
  console.log(`Unique articles: ${unique.length}`);

  // Save the index
  fs.writeFileSync(
    path.join(__dirname, 'article-index.json'),
    JSON.stringify(unique, null, 2)
  );
  console.log('Saved to article-index.json');

  await browser.close();
})();
