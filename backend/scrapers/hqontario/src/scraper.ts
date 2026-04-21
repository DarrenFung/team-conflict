import { chromium, type Browser, type Page } from "playwright";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HospitalWaitTime {
  name: string;
  orgId: number;
  /** Hours to first assessment by a doctor (PIA) */
  firstAssessmentHours: number | null;
  /** Length of stay for low-urgency patients not admitted (L) */
  lowUrgencyHours: number | null;
  /** Length of stay for high-urgency patients not admitted (NAH) */
  highUrgencyHours: number | null;
  /** Length of stay for admitted patients (A) */
  admittedHours: number | null;
}

export interface ProvincialSummary {
  reportingPeriod: string;
  firstAssessment: { mean: number; p90: number };
  lowUrgency: { mean: number; target: number; pctWithinTarget: number };
  highUrgency: { mean: number; target: number; pctWithinTarget: number };
  admitted: { mean: number; target: number; pctWithinTarget: number };
}

export interface HospitalByDistance {
  name: string;
  orgId: string;
  lhin: string;
  distanceKm: number;
  firstAssessmentHours: number | null;
}

interface TopHospitalRecord {
  SNum: number;
  LOS_mean: number;
  Name: string;
  Key: string;
}

interface EDSummaryRecord {
  Key: string;
  ResultType: string | null;
  WaitTime_mean: string;
  WaitTime_90percentile: string;
  WaitTime_percent_within_target: string;
  Target: number | null;
  number_of_cases: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_URL =
  "https://www.hqontario.ca/system-performance/time-spent-in-emergency-departments";

const TOP_HOSPITALS_API =
  "https://drivepublic.hqontario.ca/Report/GetTopHospitalsEDCombined";

const ED_SUMMARY_API =
  "https://drivepublic.hqontario.ca/Report/GetWaitTimesEDData";

const POSTAL_CODE_API =
  "https://www.hqontario.ca/webservices/wsWaitTimesSP_WT.asmx/getTableDataByPostalCode";

type IndicatorCode = "PIA" | "L" | "NAH" | "A";

const INDICATOR_LABELS: Record<IndicatorCode, string> = {
  PIA: "Hours to First Assessment by Doctor",
  L: "Length of Stay - Low-Urgency (Not Admitted)",
  NAH: "Length of Stay - High-Urgency (Not Admitted)",
  A: "Length of Stay - Admitted Patients",
};

// ─── Browser helper ──────────────────────────────────────────────────────────

async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(BASE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // Wait for the key data table to be present in the DOM
    await page.waitForSelector("#top-ten-hospitals-table", { timeout: 30000 });
    await page.waitForTimeout(2000);
    return await fn(page);
  } finally {
    await browser.close();
  }
}

// ─── Scrape all hospital data ────────────────────────────────────────────────

async function fetchIndicator(
  page: Page,
  resultType: IndicatorCode
): Promise<TopHospitalRecord[]> {
  return page.evaluate(
    async ({ url, rt }) => {
      const resp = await fetch(
        `${url}?ResultType=${rt}&org_ID=-354&fieldName=LOS_mean&lang=EN`
      );
      return resp.json();
    },
    { url: TOP_HOSPITALS_API, rt: resultType }
  );
}

async function fetchSummary(page: Page): Promise<EDSummaryRecord[]> {
  return page.evaluate(async (url) => {
    const resp = await fetch(
      `${url}?org_ID=-354&showOnlyLatestPeriod=true&lang=EN`
    );
    return resp.json();
  }, ED_SUMMARY_API);
}

export async function scrapeAllHospitalData(): Promise<{
  hospitals: HospitalWaitTime[];
  summary: ProvincialSummary;
}> {
  return withPage(async (page) => {
    // Fetch all 4 indicators + summary in parallel
    const [pia, low, high, admitted, summaryRaw] = await Promise.all([
      fetchIndicator(page, "PIA"),
      fetchIndicator(page, "L"),
      fetchIndicator(page, "NAH"),
      fetchIndicator(page, "A"),
      fetchSummary(page),
    ]);

    // Build a map of orgId → hospital data
    const hospitalMap = new Map<number, HospitalWaitTime>();

    const addRecords = (
      records: TopHospitalRecord[],
      field: keyof Omit<HospitalWaitTime, "name" | "orgId">
    ) => {
      for (const r of records) {
        if (r.SNum === -354) continue; // Skip provincial average
        let h = hospitalMap.get(r.SNum);
        if (!h) {
          h = {
            name: r.Name,
            orgId: r.SNum,
            firstAssessmentHours: null,
            lowUrgencyHours: null,
            highUrgencyHours: null,
            admittedHours: null,
          };
          hospitalMap.set(r.SNum, h);
        }
        h[field] = r.LOS_mean;
      }
    };

    addRecords(pia, "firstAssessmentHours");
    addRecords(low, "lowUrgencyHours");
    addRecords(high, "highUrgencyHours");
    addRecords(admitted, "admittedHours");

    const hospitals = Array.from(hospitalMap.values()).sort(
      (a, b) => (a.firstAssessmentHours ?? 999) - (b.firstAssessmentHours ?? 999)
    );

    // Parse summary — use provincial averages from the table data (Ontario row)
    // The summary API returns different metrics; the table's Ontario row matches what the page displays
    const ontarioPIA = pia.find((r) => r.SNum === -354);
    const ontarioLow = low.find((r) => r.SNum === -354);
    const ontarioHigh = high.find((r) => r.SNum === -354);
    const ontarioAdm = admitted.find((r) => r.SNum === -354);
    const period = ontarioPIA?.Key ?? summaryRaw[0]?.Key ?? "unknown";

    const findSummary = (rt: string | null) =>
      summaryRaw.find((s) => s.ResultType === rt);
    const lowS = findSummary("L")!;
    const highS = findSummary("NAH") || findSummary("H");
    const admS = findSummary("A")!;

    const summary: ProvincialSummary = {
      reportingPeriod: formatPeriod(period),
      firstAssessment: {
        mean: ontarioPIA?.LOS_mean ?? 0,
        p90: parseFloat(
          (findSummary(null) || findSummary("PIA"))?.WaitTime_90percentile ?? "0"
        ),
      },
      lowUrgency: {
        mean: ontarioLow?.LOS_mean ?? parseFloat(lowS.WaitTime_mean),
        target: lowS.Target ?? 4,
        pctWithinTarget: parseFloat(lowS.WaitTime_percent_within_target),
      },
      highUrgency: {
        mean: ontarioHigh?.LOS_mean ?? parseFloat(highS?.WaitTime_mean ?? "0"),
        target: highS?.Target ?? 8,
        pctWithinTarget: parseFloat(
          highS?.WaitTime_percent_within_target ?? "0"
        ),
      },
      admitted: {
        mean: ontarioAdm?.LOS_mean ?? parseFloat(admS.WaitTime_mean),
        target: admS.Target ?? 8,
        pctWithinTarget: parseFloat(admS.WaitTime_percent_within_target),
      },
    };

    return { hospitals, summary };
  });
}

// ─── Postal code → hospitals by distance ─────────────────────────────────────

export async function getHospitalsByDistance(
  postalCode: string
): Promise<HospitalByDistance[]> {
  return withPage(async (page) => {
    // Click postal code tab, fill input, and search
    await page.click("#rdBtnPostalCode");
    await page.waitForTimeout(500);
    await page.fill("#inputPostalCode", postalCode);
    await page.waitForTimeout(300);
    await page.click("#btnSearch");
    await page.waitForTimeout(5000);

    // Extract search results
    const distanceResults: Array<{
      name: string;
      orgId: string;
      lhin: string;
      distanceKm: number;
    }> = await page.evaluate(() => {
      const table = document.querySelector("#tblSearch");
      if (!table) return [];
      return Array.from(table.querySelectorAll("tbody tr")).map((tr) => {
        const cells = tr.querySelectorAll("td");
        const link = cells[0]?.querySelector("a");
        return {
          name: cells[0]?.textContent?.trim() || "",
          orgId: link?.getAttribute("data-orgid") || "",
          lhin: cells[1]?.textContent?.trim() || "",
          distanceKm: parseInt(cells[2]?.textContent?.trim() || "0", 10),
        };
      });
    });

    // Also fetch the first-assessment data to cross-reference
    const piaData: TopHospitalRecord[] = await fetchIndicator(page, "PIA");
    const piaMap = new Map(piaData.map((r) => [r.SNum, r.LOS_mean]));

    return distanceResults.map((r) => ({
      ...r,
      firstAssessmentHours:
        piaMap.get(parseInt(r.orgId, 10)) ?? null,
    }));
  });
}

// ─── Markdown export ─────────────────────────────────────────────────────────

export function toMarkdown(
  hospitals: HospitalWaitTime[],
  summary: ProvincialSummary
): string {
  const lines: string[] = [];

  lines.push("# Ontario Emergency Department Wait Times");
  lines.push("");
  lines.push(
    `> Data source: National Ambulatory Care Reporting System (NACRS), CIHI — provided by Ontario Health`
  );
  lines.push(`> Reporting period: ${summary.reportingPeriod}`);
  lines.push("");

  // Provincial summary
  lines.push("## Provincial Summary");
  lines.push("");
  lines.push("| Metric | Average (Hours) | 90th Percentile | Target (Hours) | % Within Target |");
  lines.push("|--------|----------------:|----------------:|---------------:|----------------:|");
  lines.push(
    `| First Assessment by Doctor | ${summary.firstAssessment.mean} | ${summary.firstAssessment.p90} | — | — |`
  );
  lines.push(
    `| Low-Urgency (Not Admitted) | ${summary.lowUrgency.mean} | — | ${summary.lowUrgency.target} | ${summary.lowUrgency.pctWithinTarget}% |`
  );
  lines.push(
    `| High-Urgency (Not Admitted) | ${summary.highUrgency.mean} | — | ${summary.highUrgency.target} | ${summary.highUrgency.pctWithinTarget}% |`
  );
  lines.push(
    `| Admitted Patients | ${summary.admitted.mean} | — | ${summary.admitted.target} | ${summary.admitted.pctWithinTarget}% |`
  );
  lines.push("");

  // Hospital table
  lines.push("## Hospital Wait Times");
  lines.push("");
  lines.push(
    "| # | Hospital | First Assessment (hrs) | Low-Urgency LOS (hrs) | High-Urgency LOS (hrs) | Admitted LOS (hrs) |"
  );
  lines.push(
    "|---|----------|----------------------:|----------------------:|-----------------------:|-------------------:|"
  );

  hospitals.forEach((h, i) => {
    const fmt = (v: number | null) => (v !== null ? v.toString() : "N/A");
    lines.push(
      `| ${i + 1} | ${h.name} | ${fmt(h.firstAssessmentHours)} | ${fmt(h.lowUrgencyHours)} | ${fmt(h.highUrgencyHours)} | ${fmt(h.admittedHours)} |`
    );
  });

  lines.push("");
  lines.push("---");
  lines.push(
    "*Generated from [HQOntario ED Wait Times](https://www.hqontario.ca/system-performance/time-spent-in-emergency-departments)*"
  );

  return lines.join("\n");
}

export function distanceResultsToMarkdown(
  postalCode: string,
  results: HospitalByDistance[]
): string {
  const lines: string[] = [];

  lines.push(`# Hospitals Near ${postalCode.toUpperCase()}`);
  lines.push("");
  lines.push(
    `> Sorted by approximate distance from ${postalCode.toUpperCase()}`
  );
  lines.push("");
  lines.push(
    "| # | Hospital | LHIN | Distance (km) | First Assessment (hrs) |"
  );
  lines.push(
    "|---|----------|------|:-------------:|:----------------------:|"
  );

  results.forEach((r, i) => {
    const fa = r.firstAssessmentHours !== null ? r.firstAssessmentHours.toString() : "N/A";
    lines.push(
      `| ${i + 1} | ${r.name} | ${r.lhin} | ${r.distanceKm} | ${fa} |`
    );
  });

  lines.push("");
  lines.push("---");
  lines.push(
    "*Generated from [HQOntario ED Wait Times](https://www.hqontario.ca/system-performance/time-spent-in-emergency-departments)*"
  );

  return lines.join("\n");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPeriod(key: string): string {
  // key is like "202602" → "February 2026"
  const year = key.substring(0, 4);
  const month = parseInt(key.substring(4, 6), 10);
  const months = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[month] || key} ${year}`;
}
