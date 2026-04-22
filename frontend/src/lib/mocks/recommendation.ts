import type { RecommendationPayload } from "@/types/recommendation";

export const mockRecommendationPayload: RecommendationPayload = {
  journeySteps: [
    { id: "profile", label: "Profile captured", state: "done" },
    { id: "assessed", label: "Situation assessed", state: "done" },
    { id: "recommendations", label: "Recommendations", state: "active" },
    { id: "followup", label: "Follow-up plan", state: "upcoming" },
    { id: "escalation", label: "Escalation check", state: "upcoming" },
  ],

  hero: {
    eyebrow: "Care navigation",
    title: "Your personalised care plan",
    subtitle:
      "Evidence-based recommendations, key insights, and coverage guidance — tailored to your profile.",
  },

  profileSituation: {
    left: {
      heading: "Type 2 Diabetes · Active management",
      facts: [
        { iconKey: "user", text: "52-year-old · BMI 31" },
        { iconKey: "calendar", text: "Elevated fasting readings · 10 days" },
        { iconKey: "pill", text: "Metformin + weekly GLP-1" },
        { iconKey: "heart", text: "Hypertension · Irregular meal timing" },
      ],
    },
    right: {
      heading: "Blood sugar running high in the mornings",
      facts: [
        { iconKey: "drop", text: "Fasting glucose 7.8–9.2 mmol/L" },
        { iconKey: "drop", text: "Bedtime reading on target" },
        { iconKey: "pill", text: "No medication changes" },
        { iconKey: "calendar", text: "Sleep schedule consistent" },
      ],
    },
  },

  primaryRecommendation: {
    title: "Managing fasting hyperglycaemia",
    status: { label: "Routine", variant: "green" },
    intro:
      "Based on your glucose pattern, the most likely cause is dawn phenomenon. Four actions to confirm and address it.",
    actionRows: [
      {
        emoji: "🔬",
        bgClass: "bg-[#E1F5EE]",
        title: "Determine the root cause",
        bullets: [
          { text: "Check glucose at 2–3 am for 3–4 nights" },
          { text: "Normal or low at 3 am then rises → dawn phenomenon" },
          { text: "Low at 3 am → Somogyi rebound — treat differently" },
        ],
      },
      {
        emoji: "💊",
        bgClass: "bg-[#E6F1FB]",
        title: "Adjust medication timing with your provider",
        bullets: [
          {
            text: "Dawn phenomenon: move bedtime metformin later, or discuss adding long-acting insulin",
          },
          { text: "Somogyi: reduce evening dose — only with provider guidance" },
        ],
      },
      {
        emoji: "🥗",
        bgClass: "bg-[#FEF3E2]",
        title: "Review your evening routine",
        bullets: [
          { text: "High-carb meals or alcohol late at night raise overnight glucose" },
          {
            text: "A small protein-rich snack before bed — nuts or Greek yoghurt — can blunt fasting spikes",
          },
        ],
      },
      {
        emoji: "📡",
        bgClass: "bg-[#f0f0f0]",
        title: "Consider upgrading to a CGM",
        bullets: [
          { text: "Fingerstick twice daily misses what happens at 2–4 am" },
          {
            text: "A CGM shows the full overnight curve — far more useful for identifying the cause",
          },
          { text: "See your insurance eligibility below for coverage details" },
        ],
      },
    ],
  },

  insights: [
    {
      id: "dawn",
      emoji: "🌅",
      bgClass: "bg-[#E1F5EE]",
      name: "Likely cause: dawn phenomenon",
      body: "Cortisol and growth hormone rise naturally before waking, driving glucose up from ~3 am. Very common in Type 2 patients on oral agents — not caused by anything you're doing wrong.",
      bar: { label: "Likelihood", value: 80, colorClass: "bg-[#0F6E56]" },
    },
    {
      id: "hba1c",
      emoji: "📈",
      bgClass: "bg-[#FEF3E2]",
      name: "HbA1c within range — for now",
      body: "At 7.4%, you're just below the 7.5% guideline threshold. Persistent morning highs will push this up. Addressing the pattern now avoids needing to intensify therapy later.",
      bar: { label: "HbA1c risk", value: 62, colorClass: "bg-[#7a4f0d]" },
    },
    {
      id: "hypertension",
      emoji: "🫀",
      bgClass: "bg-[#E6F1FB]",
      name: "Hypertension adds monitoring priority",
      body: "Diabetes plus hypertension together raise cardiovascular risk significantly. Annual kidney function (eGFR) and urine albumin checks are essential — and often missed without a structured care plan.",
    },
  ],

  advocacy: [
    {
      id: "endo-prep",
      emoji: "📋",
      bgClass: "bg-[#E6F1FB]",
      title: "Endocrinologist visit prep",
      subtitle: "Questions + lab checklist for your next appointment",
    },
    {
      id: "cgm-check",
      emoji: "📱",
      bgClass: "bg-[#E1F5EE]",
      title: "CGM coverage check",
      subtitle: "Insurance + prior auth guide for your plan",
    },
    {
      id: "glucose-log",
      emoji: "📊",
      bgClass: "bg-[#f0f0f0]",
      title: "Overnight glucose log",
      subtitle: "3 am check template — print or digital",
    },
    {
      id: "escalate",
      emoji: "🚨",
      bgClass: "bg-[#FDF0EE]",
      title: "When to escalate",
      subtitle: "Red flags requiring urgent or emergency care",
    },
  ],

  insurance: {
    plans: {
      medicare: {
        covered: 5,
        auth: 3,
        cost: "$0–$35",
        cards: [
          {
            title: "CGM / Devices",
            badgeLabel: "Covered",
            badgeVariant: "teal",
            items: [
              {
                status: "ok",
                title: "Covered under Part B",
                detail: "For insulin users meeting intensive management criteria.",
              },
              {
                status: "warn",
                title: "Prior auth required",
                detail:
                  "Doctor submits to DME supplier. Libre 2/3 and Dexcom G7 approved.",
              },
              {
                status: "ok",
                title: "20% co-insurance after deductible",
                detail: "$240/year deductible, then 20%. Medigap covers the gap.",
              },
              {
                status: "info",
                title: "Part D may also cover supplies",
                detail: "Sensors may be covered under Part D if not billed as DME.",
              },
            ],
          },
          {
            title: "Medications",
            badgeLabel: "Covered",
            badgeVariant: "teal",
            items: [
              {
                status: "ok",
                title: "Metformin: $0–$5/month",
                detail: "Tier 1 generic on most Part D plans.",
              },
              {
                status: "warn",
                title: "GLP-1s: Tier 3–4",
                detail: "$35–$100/month after deductible. Step therapy may apply.",
              },
              {
                status: "ok",
                title: "$35 insulin cap (Part D)",
                detail: "Monthly insulin capped under the Inflation Reduction Act.",
              },
              {
                status: "info",
                title: "Review formulary annually",
                detail: "Compare during open enrolment Oct 15–Dec 7.",
              },
            ],
          },
          {
            title: "Mental health",
            badgeLabel: "Covered",
            badgeVariant: "teal",
            items: [
              {
                status: "ok",
                title: "Outpatient therapy at 80%",
                detail: "After deductible with a participating psychologist.",
              },
              {
                status: "warn",
                title: "CBT covered with conditions",
                detail: "Must be billed under mental health CPT codes.",
              },
              {
                status: "info",
                title: "Mental Health Parity applies",
                detail: "Medicare must cover at parity with medical services.",
              },
              {
                status: "ok",
                title: "Annual depression screening: free",
                detail: "Covered 100% as preventive care.",
              },
            ],
          },
        ],
      },
      medicaid: {
        covered: 6,
        auth: 2,
        cost: "$0–$4",
        cards: [
          {
            title: "CGM / Devices",
            badgeLabel: "Partial",
            badgeVariant: "amber",
            items: [
              {
                status: "warn",
                title: "Coverage varies by state",
                detail: "Most states cover insulin-dependent patients.",
              },
              {
                status: "ok",
                title: "Low or no cost-share",
                detail: "Typically $0–$4 depending on state co-pay schedules.",
              },
              {
                status: "warn",
                title: "Prior auth common",
                detail: "Prescriber submits Letter of Medical Necessity.",
              },
              {
                status: "info",
                title: "Managed care plans vary",
                detail: "MCO plans may have additional rules.",
              },
            ],
          },
          {
            title: "Medications",
            badgeLabel: "Covered",
            badgeVariant: "teal",
            items: [
              {
                status: "ok",
                title: "Metformin: $0–$1/month",
                detail: "Tier 1 generic on all state formularies.",
              },
              {
                status: "warn",
                title: "GLP-1s: step therapy required",
                detail: "Must try metformin first. Prior auth needed.",
              },
              {
                status: "ok",
                title: "Insulin at low cost",
                detail: "All FDA-approved insulins covered at $0–$4.",
              },
              {
                status: "info",
                title: "Use the preferred drug list",
                detail: "PDL drugs avoid PA requirements.",
              },
            ],
          },
          {
            title: "Mental health",
            badgeLabel: "Covered",
            badgeVariant: "teal",
            items: [
              {
                status: "ok",
                title: "Mandatory federal benefit",
                detail: "All state Medicaid programs must cover mental health.",
              },
              {
                status: "ok",
                title: "CBT covered in most states",
                detail: "Telehealth broadly available.",
              },
              {
                status: "ok",
                title: "Crisis services: no prior auth",
                detail: "Emergency psychiatric care covered immediately.",
              },
              {
                status: "info",
                title: "FQHCs for shorter wait times",
                detail: "Integrated mental health and primary care.",
              },
            ],
          },
        ],
      },
      private: {
        covered: 4,
        auth: 4,
        cost: "$20–$120",
        cards: [
          {
            title: "CGM / Devices",
            badgeLabel: "Partial",
            badgeVariant: "amber",
            items: [
              {
                status: "warn",
                title: "Coverage varies by plan",
                detail: "Required for most insulin-using patients under ACA.",
              },
              {
                status: "warn",
                title: "Prior auth almost always required",
                detail: "Submit Certificate of Medical Necessity. 3–10 days.",
              },
              {
                status: "info",
                title: "Check your approved device list",
                detail: "Libre 2/3 and Dexcom G6/G7 on most commercial plans.",
              },
              {
                status: "no",
                title: "HDHP: full cost until deductible",
                detail: "~$75–$120/month per sensor until deductible. Use HSA.",
              },
            ],
          },
          {
            title: "Medications",
            badgeLabel: "Partial",
            badgeVariant: "amber",
            items: [
              {
                status: "ok",
                title: "Metformin: $0–$10/month",
                detail: "Tier 1 on virtually every commercial formulary.",
              },
              {
                status: "warn",
                title: "GLP-1s: $25–$200/month",
                detail: "Manufacturer copay cards can reduce to $25/month.",
              },
              {
                status: "info",
                title: "Use manufacturer savings cards",
                detail: "Novo Nordisk and Eli Lilly offer copay assistance.",
              },
              {
                status: "warn",
                title: "Step therapy may apply",
                detail: "Some plans require documented metformin failure.",
              },
            ],
          },
          {
            title: "Mental health",
            badgeLabel: "Partial",
            badgeVariant: "amber",
            items: [
              {
                status: "ok",
                title: "Mental Health Parity Act applies",
                detail: "Employers 50+ and ACA plans must cover at parity.",
              },
              {
                status: "warn",
                title: "In-network therapists preferred",
                detail: "Out-of-network may be 50–70% after deductible.",
              },
              {
                status: "info",
                title: "EAP: 6–8 free sessions typical",
                detail: "Check with your HR department.",
              },
              {
                status: "warn",
                title: "Telehealth coverage varies",
                detail: "Most ACA plans cover telehealth mental health.",
              },
            ],
          },
        ],
      },
      uninsured: {
        covered: 0,
        auth: 0,
        cost: "Varies",
        cards: [
          {
            title: "CGM / Devices",
            badgeLabel: "Check options",
            badgeVariant: "blue",
            items: [
              {
                status: "info",
                title: "FreeStyle Libre: ~$75/month OTC",
                detail: "Available without prescription in many US states.",
              },
              {
                status: "info",
                title: "Manufacturer assistance programs",
                detail: "Abbott and Dexcom have PAPs for uninsured patients.",
              },
              {
                status: "warn",
                title: "FQHC: sliding scale fees",
                detail: "Income-based pricing at Federally Qualified Health Centers.",
              },
              {
                status: "info",
                title: "Check Medicaid eligibility",
                detail: "Many uninsured individuals qualify but haven't enrolled.",
              },
            ],
          },
          {
            title: "Medications",
            badgeLabel: "Check options",
            badgeVariant: "blue",
            items: [
              {
                status: "info",
                title: "GoodRx: metformin from $4",
                detail: "At Walmart, Kroger, and other major pharmacies.",
              },
              {
                status: "info",
                title: "Cost Plus Drugs: ~$3/month",
                detail: "costplusdrugs.com — transparent wholesale pricing.",
              },
              {
                status: "warn",
                title: "GLP-1 PAPs: income-based",
                detail: "Novo Nordisk and Lilly Cares offer low-cost medications.",
              },
              {
                status: "info",
                title: "340B pharmacy discounts",
                detail: "Deep discounts at 340B-eligible health centres.",
              },
            ],
          },
          {
            title: "Mental health",
            badgeLabel: "Check options",
            badgeVariant: "blue",
            items: [
              {
                status: "info",
                title: "Open Path: $30–$80/session",
                detail: "Network of licensed therapists for uninsured clients.",
              },
              {
                status: "info",
                title: "Community Mental Health Centers",
                detail: "Sliding-scale therapy, often $0–$20/session.",
              },
              {
                status: "info",
                title: "Psychology Today sliding scale",
                detail: "Filter by financial assistance when searching.",
              },
              {
                status: "warn",
                title: "SAMHSA helpline: 1-800-662-4357",
                detail: "Free, confidential mental health referrals.",
              },
            ],
          },
        ],
      },
    },
    takeActionRows: [
      {
        id: "prior-auth",
        emoji: "📋",
        bgClass: "bg-[#E6F1FB]",
        title: "Prior auth checklist",
        subtitle: "Tailored to your plan and condition",
      },
      {
        id: "appeal",
        emoji: "⚖️",
        bgClass: "bg-[#FEF3E2]",
        title: "Appeal a denied claim",
        subtitle: "Step-by-step appeal process",
      },
      {
        id: "medication-cost",
        emoji: "💊",
        bgClass: "bg-[#E1F5EE]",
        title: "Medication cost programs",
        subtitle: "Manufacturer PAPs, GoodRx, 340B",
      },
      {
        id: "call-script",
        emoji: "📞",
        bgClass: "bg-[#f0f0f0]",
        title: "Insurance call script",
        subtitle: "Exact questions to ask your insurer",
      },
    ],
  },

  careSummary: {
    title: "Care summary",
    subtitle: "Type 2 Diabetes · Today",
    stats: [
      { label: "HbA1c", value: "7.4%", variant: "warn" },
      { label: "Fasting glucose", value: "7.8–9.2 mmol/L", variant: "warn" },
      { label: "Bedtime reading", value: "On target", variant: "positive" },
      { label: "Medications", value: "Metformin + GLP-1", variant: "neutral" },
      { label: "Priority", value: "Routine", variant: "positive" },
    ],
    actions: [
      { id: "followup", label: "Book follow-up", subtitle: "Within 1–2 weeks" },
      { id: "specialist", label: "Find a specialist", subtitle: "Endocrinologists near you" },
      { id: "update-profile", label: "Update my profile", subtitle: "Add new readings or symptoms" },
    ],
  },
};
