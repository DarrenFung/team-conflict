import { NextResponse } from "next/server";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PatientReviewSectionId =
  | "concern"
  | "duration"
  | "severity"
  | "treatment"
  | "coverage";

export type PatientReviewSection = {
  id: PatientReviewSectionId;
  body: string;
};

export type PatientReviewTags = {
  location?: string;
  planType?: string;
  urgency?: string;
  benefitStatus?: string;
};

export type PatientReview = {
  sections: PatientReviewSection[];
  tags: PatientReviewTags;
};

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, moduleResults, greetingName, encounterId, anonymousAccessToken } =
      body as {
        messages: unknown[];
        moduleResults: Record<string, unknown>;
        greetingName: string;
        encounterId: string | null;
        anonymousAccessToken?: string;
      };

    void moduleResults;
    void greetingName;
    void encounterId;
    void anonymousAccessToken;

    // Derive a plain-text transcript from the message history so the LLM can
    // summarise it into the structured PatientReview shape.
    const transcript = (messages as Array<{ role: string; parts?: Array<{ type: string; text?: string }> }>)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => {
        const text = (m.parts ?? [])
          .filter((p) => p.type === "text")
          .map((p) => p.text ?? "")
          .join(" ")
          .replace("[COMPLETE]", "")
          .trim();
        return text ? `${m.role === "user" ? "Patient" : "Luke"}: ${text}` : null;
      })
      .filter(Boolean)
      .join("\n");

    const { generateObject } = await import("ai");
    const { vertex } = await import("@/lib/vertex");
    const { z } = await import("zod");

    const schema = z.object({
      sections: z.array(
        z.object({
          id: z.enum(["concern", "duration", "severity", "treatment", "coverage"]),
          body: z.string(),
        }),
      ),
      tags: z.object({
        location: z.string().optional(),
        planType: z.string().optional(),
        urgency: z.string().optional(),
        benefitStatus: z.string().optional(),
      }),
    });

    const { object } = await generateObject({
      model: vertex("gemini-2.0-flash-001"),
      schema,
      prompt: `You are a medical intake summariser. Given the following intake conversation, extract a structured patient review.

TRANSCRIPT:
${transcript}

Return:
- sections: one entry per id (concern, duration, severity, treatment, coverage). If information is absent for a section, write a short "Not mentioned" placeholder.
- tags: optional short labels — location (city/state if mentioned), planType (e.g. "PPO", "HMO"), urgency (e.g. "Urgent", "Routine"), benefitStatus (e.g. "In-network").`,
    });

    return NextResponse.json(object satisfies PatientReview);
  } catch (err) {
    console.error("[patient-review] error", err);
    return NextResponse.json(
      { error: "Failed to generate patient review" },
      { status: 500 },
    );
  }
}
