import { jsPDF } from "jspdf";
import type { IntakeData } from "./extract-intake-data";

// Layout constants (points — 72pt = 1in)
const PAGE_W = 612; // US Letter width
const PAGE_H = 792; // US Letter height
const MARGIN = 54; // 0.75in
const CONTENT_W = PAGE_W - 2 * MARGIN;
const FOOTER_Y = PAGE_H - 36;
const BOTTOM_LIMIT = FOOTER_Y - 18; // stop content here

// Colors
const NAVARA_BLUE: [number, number, number] = [24, 95, 165];
const BODY_COLOR: [number, number, number] = [26, 32, 51];
const MUTED_COLOR: [number, number, number] = [107, 114, 128];
const DIVIDER_COLOR: [number, number, number] = [227, 234, 242];

let pageCount = 0;

function renderFooter(doc: jsPDF) {
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_COLOR);
  doc.setFont("helvetica", "normal");
  doc.text("Navara — Confidential Patient Information", MARGIN, FOOTER_Y);
  doc.text(`Page ${pageCount}`, PAGE_W - MARGIN, FOOTER_Y, {
    align: "right",
  });
}

function addPage(doc: jsPDF): number {
  renderFooter(doc);
  doc.addPage();
  pageCount++;
  return MARGIN + 10;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > BOTTOM_LIMIT) {
    return addPage(doc);
  }
  return y;
}

/**
 * Render a block of text that may contain simple markdown:
 * - `**bold**` → toggle bold
 * - `## Heading` → section heading style
 * - `- item` → bullet
 * - blank line → vertical gap
 *
 * Returns the new Y position.
 */
function renderMarkdownBlock(
  doc: jsPDF,
  text: string,
  startY: number,
  fontSize = 10,
  lineHeight = 14,
): number {
  let y = startY;
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Blank line
    if (!trimmed) {
      y += lineHeight * 0.5;
      continue;
    }

    // Heading (## or ###)
    if (/^#{1,3}\s/.test(trimmed)) {
      const headingText = trimmed.replace(/^#{1,3}\s+/, "");
      y = ensureSpace(doc, y, lineHeight + 6);
      y += 4;
      doc.setFontSize(fontSize + 1);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...NAVARA_BLUE);
      const wrapped = doc.splitTextToSize(headingText, CONTENT_W);
      for (const wl of wrapped) {
        y = ensureSpace(doc, y, lineHeight);
        doc.text(wl, MARGIN, y);
        y += lineHeight;
      }
      doc.setTextColor(...BODY_COLOR);
      doc.setFontSize(fontSize);
      y += 2;
      continue;
    }

    // Bullet
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)/);
    const bulletText = bulletMatch ? bulletMatch[1] : null;
    const effectiveText = bulletText ?? trimmed;

    // Render text with inline **bold** spans
    const segments = effectiveText.split(/(\*\*[^*]+\*\*)/g);
    // Pre-calculate total wrapped text to check space
    const plainText = effectiveText.replace(/\*\*/g, "");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    const estimatedLines = doc.splitTextToSize(
      plainText,
      bulletText ? CONTENT_W - 14 : CONTENT_W,
    );
    y = ensureSpace(doc, y, estimatedLines.length * lineHeight);

    // For simplicity with mixed bold/normal, render the full line using
    // splitTextToSize and toggle fonts per segment. jsPDF doesn't natively
    // support inline style changes across wrapped lines, so we use a
    // two-pass approach: first wrap the plain text, then for each wrapped
    // line render it with bold segments re-applied.
    const indent = bulletText ? MARGIN + 14 : MARGIN;
    const maxW = bulletText ? CONTENT_W - 14 : CONTENT_W;

    if (bulletText) {
      doc.setFont("helvetica", "normal");
      doc.text("\u2022", MARGIN + 4, y);
    }

    // Simple approach: if no bold markers, just wrap and render
    if (!effectiveText.includes("**")) {
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(effectiveText, maxW);
      for (const wl of wrapped) {
        y = ensureSpace(doc, y, lineHeight);
        doc.text(wl, indent, y);
        y += lineHeight;
      }
    } else {
      // Render line-by-line with bold segments
      // Flatten to plain text for wrapping, then re-apply formatting per line
      const wrapped = doc.splitTextToSize(plainText, maxW);
      let charCursor = 0;
      for (const wl of wrapped) {
        y = ensureSpace(doc, y, lineHeight);
        // Find where this wrapped line falls in the original segments
        // Simple approach: just render the wrapped line and bold the
        // entire thing if it came from a bold segment. For a hackathon
        // this is sufficient — full inline bold would need a char-level
        // cursor with doc.text offset tracking.
        const isBoldLine = isMostlyBold(effectiveText, charCursor, wl.length);
        doc.setFont("helvetica", isBoldLine ? "bold" : "normal");
        doc.text(wl, indent, y);
        charCursor += wl.length;
        y += lineHeight;
      }
      doc.setFont("helvetica", "normal");
    }
  }

  return y;
}

/**
 * Heuristic: check if the portion of the source text starting at `offset` for
 * `length` chars falls within a **bold** region.
 */
function isMostlyBold(
  source: string,
  offset: number,
  length: number,
): boolean {
  // Strip markdown to map plain-text offsets to source offsets
  let plainIdx = 0;
  let srcIdx = 0;
  let inBold = false;
  let boldChars = 0;
  let totalChars = 0;

  while (srcIdx < source.length && plainIdx < offset + length) {
    if (source.substring(srcIdx, srcIdx + 2) === "**") {
      inBold = !inBold;
      srcIdx += 2;
      continue;
    }
    if (plainIdx >= offset) {
      totalChars++;
      if (inBold) boldChars++;
    }
    plainIdx++;
    srcIdx++;
  }

  return totalChars > 0 && boldChars / totalChars > 0.5;
}

function renderSectionHeading(
  doc: jsPDF,
  y: number,
  title: string,
): number {
  y = ensureSpace(doc, y, 28);
  y += 6;

  // Divider line
  doc.setDrawColor(...DIVIDER_COLOR);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 12;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVARA_BLUE);
  doc.text(title, MARGIN, y);
  y += 16;

  doc.setTextColor(...BODY_COLOR);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  return y;
}

export function generateIntakePdf(data: IntakeData): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  pageCount = 1;

  // ── Header bar ──
  doc.setFillColor(...NAVARA_BLUE);
  doc.rect(0, 0, PAGE_W, 72, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("times", "bold");
  doc.text("Navara", MARGIN, 32);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Patient Intake Summary", MARGIN, 50);

  doc.setFontSize(9);
  doc.text(data.encounterDate, PAGE_W - MARGIN, 32, { align: "right" });
  doc.text(`Patient: ${data.patientName}`, PAGE_W - MARGIN, 46, {
    align: "right",
  });

  // Reset text color
  doc.setTextColor(...BODY_COLOR);

  let y = 92;

  // ── Chief Complaint ──
  y = renderSectionHeading(doc, y, "Chief Complaint");
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const ccLines = doc.splitTextToSize(data.chiefComplaint, CONTENT_W);
  for (const line of ccLines) {
    y = ensureSpace(doc, y, 14);
    doc.text(line, MARGIN, y);
    y += 14;
  }

  // ── Structured Symptom Data ──
  if (data.firstHxSymptoms && data.firstHxSymptoms.length > 0) {
    y = renderSectionHeading(doc, y, "Structured Symptom Assessment");

    for (const item of data.firstHxSymptoms) {
      y = ensureSpace(doc, y, 28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED_COLOR);
      doc.text(item.question, MARGIN + 4, y);
      y += 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...BODY_COLOR);
      const answerLines = doc.splitTextToSize(item.display, CONTENT_W - 8);
      for (const line of answerLines) {
        y = ensureSpace(doc, y, 14);
        doc.text(line, MARGIN + 4, y);
        y += 14;
      }
      y += 4;
    }
  }

  // ── Clinician Summary ──
  if (data.clinicianSummary) {
    y = renderSectionHeading(doc, y, "Clinician Summary");
    y = renderMarkdownBlock(doc, data.clinicianSummary, y);
  }

  // ── Recommendation ──
  if (data.recommendation) {
    y = renderSectionHeading(doc, y, "Care Recommendation");
    y = renderMarkdownBlock(doc, data.recommendation, y);
  }

  // ── Uploaded Documents ──
  if (data.uploadedFiles && data.uploadedFiles.length > 0) {
    y = renderSectionHeading(doc, y, "Uploaded Documents");
    for (const upload of data.uploadedFiles) {
      y = ensureSpace(doc, y, 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED_COLOR);
      doc.text(upload.specId.replace(/_/g, " "), MARGIN + 4, y);
      y += 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...BODY_COLOR);
      for (const filename of upload.filenames) {
        y = ensureSpace(doc, y, 14);
        doc.text(`\u2022  ${filename}`, MARGIN + 8, y);
        y += 14;
      }
      y += 4;
    }
  }

  // ── Disclaimer ──
  y = ensureSpace(doc, y, 60);
  y += 16;
  doc.setDrawColor(...DIVIDER_COLOR);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 14;

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...MUTED_COLOR);
  const disclaimer =
    "This summary was generated by Navara AI intake and is not a medical diagnosis. " +
    "Please share with your healthcare provider for professional evaluation.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, CONTENT_W);
  for (const line of disclaimerLines) {
    doc.text(line, MARGIN, y);
    y += 11;
  }

  // Render footer on the last page
  renderFooter(doc);

  doc.save("navara-intake-summary.pdf");
}
