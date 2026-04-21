"use client";

import { useState } from "react";
import type { UIMessage } from "ai";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  messages: UIMessage[];
  greetingName: string;
  moduleResults: Record<string, unknown>;
};

export function DownloadPdfButton({
  messages,
  greetingName,
  moduleResults,
}: Props) {
  const [generating, setGenerating] = useState(false);

  async function handleClick() {
    if (generating) return;
    setGenerating(true);
    try {
      const { extractIntakeData } = await import("@/lib/pdf/extract-intake-data");
      const { generateIntakePdf } = await import("@/lib/pdf/generate-intake-pdf");
      const data = extractIntakeData(messages, greetingName, moduleResults);
      generateIntakePdf(data);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={handleClick}
      disabled={generating}
      className="mx-auto border-primary/25 text-primary hover:border-primary hover:bg-secondary"
    >
      <Download className="mr-1.5 size-4" />
      {generating ? "Generating..." : "Download PDF for your care provider"}
    </Button>
  );
}
