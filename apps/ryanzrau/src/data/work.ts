export interface WorkEntry {
  company: string;
  role: string;
  date: string;
  points: string[];
}

export const workHistory: WorkEntry[] = [
  {
    company: "Affirma @ Meta",
    role: "Senior Software Engineer",
    date: "Feb 2024 — Present",
    points: [
      "Architected asset management system handling 100k+ assets across 100 teams",
      "Achieved 70% memory reduction through system-wide performance optimization",
      "Led cross-functional initiatives spanning multiple engineering organizations",
    ],
  },
  {
    company: "Affirma @ Meta",
    role: "Software Engineer II",
    date: "Jan 2023 — Feb 2024",
    points: [
      "Built internal tooling MVP from zero to production adoption",
      "Ported web platform to React Native mobile application",
      "Onboarded and mentored 10+ developers across multiple teams",
    ],
  },
  {
    company: "Affirma @ Meta",
    role: "Software Engineer I",
    date: "Apr 2022 — Jan 2023",
    points: [
      "Developed health & safety tools with PHP and React",
      "Created reusable triage tree framework for incident response",
    ],
  },
  {
    company: "Affirma",
    role: "Software Engineering Intern",
    date: "Nov 2019 — Sept 2021",
    points: [
      "Built Angular/C# energy reporting dashboard",
      "Developed Xamarin cross-platform mobile application",
    ],
  },
  {
    company: "UofA STEM Education",
    role: "Software Developer",
    date: "Jul 2017 — May 2021",
    points: [
      "Built Django inventory management system tracking 800+ items",
      "Improved departmental workflows by 50% through automation",
    ],
  },
];
