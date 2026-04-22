import type { RecommendationPayload } from "@/types/recommendation";

export const mockRecommendationPayload: RecommendationPayload = {
  profile: {
    location: "North York, ON",
    meta: "Assessed today · Knee pain",
    badges: [
      { label: "GreenShield Flex", variant: "blue" },
      { label: "Non-urgent", variant: "teal" },
      { label: "EAP active", variant: "purple" },
    ],
    left: {
      heading: "What you described",
      facts: [
        { emoji: "🦵", text: "Left knee pain · 3 weeks" },
        { emoji: "🚶", text: "Worse going down stairs and after activity" },
        { emoji: "⚡", text: "Severity 5–6 / 10 · Moderate" },
        { emoji: "✅", text: "No injury, no swelling, no locking" },
      ],
    },
    right: {
      heading: "What you've tried",
      facts: [
        { emoji: "💊", text: "Rest and OTC pain relief" },
        { emoji: "🧊", text: "Ice — limited improvement" },
        { emoji: "➖", text: "No prior physiotherapy" },
        { emoji: "➖", text: "No imaging or specialist seen" },
      ],
    },
  },

  urgency: {
    variant: "non-urgent",
    message:
      "Based on your symptoms, this is non-urgent — no ER visit needed. Physiotherapy is the right first step.",
  },

  recommendation: {
    title: "Start with physiotherapy",
    status: { label: "Routine", variant: "green" },
    intro:
      "Based on your symptom profile — gradual onset, no trauma, moderate severity — patellofemoral pain or IT band syndrome is the most likely cause. Physiotherapy is the evidence-based first step and is fully covered by your plan.",
    actionRows: [
      {
        emoji: "🏃",
        colorVariant: "blue",
        title: "Book a physiotherapy assessment this week",
        bullets: [
          "GreenShield covers $800/yr — full balance available, $0 out of pocket",
          "3 in-network providers within 2km with direct billing",
        ],
      },
      {
        emoji: "🔬",
        colorVariant: "teal",
        title: "Expect 4–6 sessions for full resolution",
        bullets: [
          "Most overuse knee conditions resolve with targeted exercise therapy in 4–6 weeks",
          "Your physio will confirm diagnosis and create a home exercise plan",
        ],
      },
      {
        emoji: "📋",
        colorVariant: "amber",
        title: "Escalate to a specialist only if needed",
        bullets: [
          "No improvement after 6 weeks → physio can refer you to an orthopaedic specialist",
          "Specialist visits and imaging (X-ray / MRI) are OHIP covered with a referral",
        ],
      },
    ],
  },

  insights: [
    {
      emoji: "🦵",
      colorVariant: "teal",
      name: "Most likely: patellofemoral pain syndrome",
      body: "Gradual onset, worsening with stairs, no trauma — highly consistent with PFPS. Responds well to targeted physiotherapy.",
      bar: { label: "Likelihood", value: 75, colorVariant: "teal" },
    },
    {
      emoji: "💪",
      colorVariant: "blue",
      name: "Physio outperforms rest alone",
      body: "Studies show physiotherapy resolves knee overuse conditions in 80%+ of cases. Rest without targeted strengthening often leads to recurrence.",
      bar: { label: "Resolution rate", value: 82, colorVariant: "blue" },
    },
    {
      emoji: "⚠️",
      colorVariant: "amber",
      name: "When to seek faster care",
      body: "Sudden swelling, warmth, locking, or inability to bear weight — see a doctor promptly. These may indicate a different condition.",
    },
  ],

  coverage: {
    plans: [
      {
        id: "greenshield",
        label: "GreenShield Flex",
        rows: [
          { status: "ok", name: "Physiotherapy", detail: "GreenShield Flex · $800/yr", value: "$0 today", valueVariant: "ok" },
          { status: "ok", name: "Direct billing", detail: "No upfront payment required", value: "Available", valueVariant: "ok" },
          { status: "ok", name: "Orthopaedic specialist", detail: "With GP or physio referral", value: "OHIP covered", valueVariant: "ok" },
          { status: "ok", name: "Imaging (X-ray / MRI)", detail: "When ordered by physician", value: "OHIP covered", valueVariant: "ok" },
          { status: "info", name: "EAP counselling", detail: "8 free sessions through employer", value: "Active", valueVariant: "info" },
          { status: "info", name: "Prescription drugs", detail: "Anti-inflammatories on formulary", value: "Co-pay applies", valueVariant: "info" },
        ],
        actions: [
          { emoji: "🏃", colorVariant: "blue", title: "Submit a physio claim", subtitle: "Direct bill through GreenShield — no paperwork needed", eta: "~2 min" },
          { emoji: "🧠", colorVariant: "purple", title: "Access EAP therapy sessions", subtitle: "8 free sessions — separate from your physio benefit", eta: "Instant access" },
          { emoji: "💊", colorVariant: "teal", title: "Check drug plan coverage", subtitle: "Anti-inflammatories and topical gels under your plan", eta: "Immediate" },
        ],
      },
      {
        id: "ohip",
        label: "OHIP only",
        rows: [
          { status: "warn", name: "Physiotherapy", detail: "Not covered by OHIP alone", value: "$75–$120/session", valueVariant: "warn" },
          { status: "ok", name: "Orthopaedic specialist", detail: "With GP referral", value: "OHIP covered", valueVariant: "ok" },
          { status: "ok", name: "Imaging (X-ray / MRI)", detail: "When ordered by physician", value: "OHIP covered", valueVariant: "ok" },
          { status: "info", name: "Walk-in clinic visit", detail: "Can refer to specialist or order imaging", value: "OHIP covered", valueVariant: "ok" },
          { status: "no", name: "EAP sessions", detail: "No employer EAP on file", value: "N/A", valueVariant: "warn" },
          { status: "warn", name: "Prescription drugs", detail: "Not covered by OHIP", value: "Out of pocket", valueVariant: "warn" },
        ],
        actions: [
          { emoji: "📍", colorVariant: "blue", title: "Find low-cost physio options", subtitle: "Community health centres near North York", eta: "See options" },
          { emoji: "🩺", colorVariant: "teal", title: "Book a walk-in clinic visit", subtitle: "Get a referral or requisition for imaging", eta: "Book now" },
        ],
      },
      {
        id: "uninsured",
        label: "No insurance",
        rows: [
          { status: "info", name: "Physiotherapy", detail: "Community health centres available", value: "Free – sliding scale", valueVariant: "info" },
          { status: "ok", name: "Orthopaedic specialist", detail: "Apply for OHIP if Ontario resident", value: "OHIP if eligible", valueVariant: "ok" },
          { status: "ok", name: "Imaging", detail: "Ordered by physician · OHIP if eligible", value: "OHIP if eligible", valueVariant: "ok" },
          { status: "info", name: "OTC pain relief", detail: "Naproxen / ibuprofen at pharmacy", value: "~$5–$12", valueVariant: "info" },
          { status: "no", name: "EAP sessions", detail: "No employer plan on file", value: "N/A", valueVariant: "warn" },
          { status: "info", name: "Ontario Drug Benefit", detail: "For income-eligible residents", value: "Apply online", valueVariant: "info" },
        ],
        actions: [
          { emoji: "🏥", colorVariant: "teal", title: "Find a community health centre", subtitle: "Free physiotherapy for eligible patients", eta: "Near you" },
          { emoji: "📋", colorVariant: "blue", title: "Apply for OHIP", subtitle: "Ontario residents eligible — apply at ontario.ca", eta: "Start now" },
        ],
      },
    ],
  },

  careResources: [
    { emoji: "📍", colorVariant: "blue", title: "Find in-network physiotherapists near you", subtitle: "3 matched providers · North York · GreenShield direct billing" },
    { emoji: "📋", colorVariant: "teal", title: "Appointment prep checklist", subtitle: "What to bring and what to tell your physio" },
    { emoji: "🚨", colorVariant: "red", title: "Red flags — when to escalate", subtitle: "Signs that mean you should see a doctor sooner" },
  ],

  careSummary: {
    title: "Care summary",
    subtitle: "Knee pain · Today",
    stats: [
      { label: "Condition", value: "Knee pain · 3 weeks", variant: "neutral" },
      { label: "Severity", value: "5–6 / 10", variant: "amber" },
      { label: "Urgency", value: "Non-urgent", variant: "teal" },
      { label: "Recommended", value: "Physiotherapy", variant: "neutral" },
      { label: "Your cost", value: "$0 covered", variant: "teal" },
    ],
    primaryAction: { label: "Book physiotherapy →" },
    actions: [
      { label: "Providers near me", subtitle: "3 in-network matches" },
      { label: "Share with my doctor", subtitle: "Send pathway summary" },
    ],
  },

  benefitsSnapshot: {
    planName: "GreenShield Flex",
    items: [
      { label: "Physiotherapy", value: "$800 remaining", variant: "teal" },
      { label: "Chiropractic", value: "$600 remaining", variant: "teal" },
      { label: "EAP sessions", value: "8 free", variant: "teal" },
      { label: "Drug plan", value: "Active", variant: "teal" },
    ],
  },
};
