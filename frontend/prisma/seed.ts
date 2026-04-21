import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const prisma = new PrismaClient();

const SCRAPERS = join(__dirname, "../../backend/scrapers");

interface Resource {
  title: string;
  content: string;
  type: "article" | "guidance";
}

async function main() {
  const articlesDir = resolve(process.argv[2] || "");
  if (!process.argv[2]) {
    console.error(
      "Usage: tsx prisma/seed.ts <articles-dir>\n" +
        "  articles-dir: path to a directory of Health811 .md article files"
    );
    process.exit(1);
  }

  const resources: Resource[] = [];

  // --- Guidance resources (checked into backend/scrapers) ---

  resources.push({
    title: "Scope of Practice",
    content: readFileSync(join(SCRAPERS, "scope_of_practice.md"), "utf-8"),
    type: "guidance",
  });

  resources.push({
    title: "ED Diversion Presenting Concerns",
    content: readFileSync(
      join(SCRAPERS, "diversion-presenting-concerns.csv"),
      "utf-8"
    ),
    type: "guidance",
  });

  resources.push({
    title: "ED Diversion Principles",
    content: readFileSync(
      join(SCRAPERS, "diversion-principles.csv"),
      "utf-8"
    ),
    type: "guidance",
  });

  // --- Article resources ---

  resources.push({
    title: "Ontario ED Wait Times",
    content: readFileSync(
      join(SCRAPERS, "hqontario/output/ed-wait-times.md"),
      "utf-8"
    ),
    type: "article",
  });

  // Health811 individual articles
  const files = readdirSync(articlesDir).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    console.error(`No .md files found in ${articlesDir}`);
    process.exit(1);
  }
  console.log(`Found ${files.length} Health811 articles in ${articlesDir}`);
  for (const file of files) {
    const content = readFileSync(join(articlesDir, file), "utf-8");
    const title = file
      .replace(/\.md$/, "")
      .replace(/-/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());
    resources.push({ title, content, type: "article" });
  }

  console.log(`Seeding ${resources.length} resources...`);

  await prisma.resource.deleteMany();

  const CHUNK = 100;
  for (let i = 0; i < resources.length; i += CHUNK) {
    const chunk = resources.slice(i, i + CHUNK);
    await prisma.resource.createMany({ data: chunk });
    console.log(
      `  inserted ${Math.min(i + CHUNK, resources.length)}/${resources.length}`
    );
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
