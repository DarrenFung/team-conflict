const fs = require('fs');
const path = require('path');

const ARTICLES_DIR = path.join(__dirname, '.articles');
const INDEX_FILE = path.join(__dirname, 'article-index.json');

const articles = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));

// Sort alphabetically by title
articles.sort((a, b) => a.title.localeCompare(b.title));

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 120);
}

// Build manifest
let manifest = `# Health811 Ontario Medical Library - Article Manifest

This manifest lists all ${articles.length} medical conditions from the [Ontario Health811 Medical Library](https://health811.ontario.ca/static/guest/medical-library/).

Each article is available as an individual .md file in the \`articles/\` directory. Use the filename to load the full content of any article.

**Last scraped:** ${new Date().toISOString().split('T')[0]}

---

| # | Article Title | Filename |
|---|---|---|
`;

let currentLetter = '';
let count = 0;

for (const article of articles) {
  const slug = slugify(article.title);
  const filename = `${slug}.md`;
  const filePath = path.join(ARTICLES_DIR, filename);
  const exists = fs.existsSync(filePath);

  const firstLetter = article.title[0].toUpperCase();
  if (firstLetter !== currentLetter) {
    currentLetter = firstLetter;
    manifest += `| | **— ${currentLetter} —** | |\n`;
  }

  count++;
  manifest += `| ${count} | ${article.title} | \`${filename}\` |\n`;
}

manifest += `\n---\n\n**Total articles:** ${count}\n`;

fs.writeFileSync(path.join(__dirname, 'manifest.md'), manifest);
console.log(`Manifest generated with ${count} articles.`);
