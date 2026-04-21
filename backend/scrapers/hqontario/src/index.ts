import * as fs from "fs";
import * as path from "path";
import {
  scrapeAllHospitalData,
  getHospitalsByDistance,
  toMarkdown,
  distanceResultsToMarkdown,
} from "./scraper";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "scrape";

  switch (command) {
    case "scrape": {
      console.log("Scraping all hospital ED wait time data...");
      const { hospitals, summary } = await scrapeAllHospitalData();
      console.log(`Found ${hospitals.length} hospitals across 4 indicators.`);

      const md = toMarkdown(hospitals, summary);
      const outPath = path.resolve("output", "ed-wait-times.md");
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, md, "utf-8");
      console.log(`Markdown exported to ${outPath}`);
      break;
    }

    case "nearby": {
      const postalCode = args[1] || "M5V 3L9";
      console.log(
        `Finding hospitals near postal code: ${postalCode.toUpperCase()}...`
      );
      const results = await getHospitalsByDistance(postalCode);
      console.log(`Found ${results.length} hospitals sorted by distance.`);

      const md = distanceResultsToMarkdown(postalCode, results);
      const outPath = path.resolve(
        "output",
        `hospitals-near-${postalCode.replace(/\s/g, "").toUpperCase()}.md`
      );
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, md, "utf-8");
      console.log(`Markdown exported to ${outPath}`);

      // Print a quick summary to stdout
      console.log("\nTop 10 nearest hospitals:");
      console.log("─".repeat(80));
      results.slice(0, 10).forEach((r, i) => {
        const fa =
          r.firstAssessmentHours !== null
            ? `${r.firstAssessmentHours}h`
            : "N/A";
        console.log(
          `  ${(i + 1).toString().padStart(2)}. ${r.name.padEnd(50)} ${String(r.distanceKm).padStart(3)} km  │  ${fa} wait`
        );
      });
      break;
    }

    default:
      console.log("Usage:");
      console.log("  npx tsx src/index.ts scrape          # Scrape all hospital data");
      console.log("  npx tsx src/index.ts nearby [postal]  # Find hospitals by distance");
      console.log("");
      console.log("Examples:");
      console.log('  npx tsx src/index.ts nearby "M5V 3L9"');
      console.log('  npx tsx src/index.ts nearby "K1A 0A6"');
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
