import Link from "next/link";

const sections = [
  {
    title: "Overview",
    body: [
      'Common Thread ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and the choices you have regarding your information when using our platform.',
      "Common Thread is designed to help students organize and plan college and summer program applications through tools such as profile building, application planning, college research, and AI-assisted feedback.",
    ],
  },
  {
    title: "Information We Collect",
    groups: [
      {
        title: "Account Information",
        items: [
          "Name",
          "Email address",
          "Authentication information through third-party login providers",
        ],
      },
      {
        title: "Application Content",
        items: [
          "Activities and extracurriculars",
          "Awards and honors",
          "Intended majors and academic interests",
          "College lists and application plans",
          "Notes, drafts, and research documents",
          "Essay drafts and application materials",
        ],
      },
      {
        title: "Technical Information",
        items: ["Usage analytics", "Error logs and performance data"],
      },
    ],
  },
  {
    title: "How We Use Information",
    body: ["We use your information to:"],
    items: [
      "Generate application planning insights and AI-powered feedback",
      "Save your profile, college lists, and documents",
      "Maintain account security",
      "Diagnose bugs and improve product performance",
    ],
    note: "We do not sell your personal information to third parties.",
  },
  {
    title: "AI Services",
    body: [
      "Some features may use third-party AI providers to generate feedback and recommendations.",
      "Information submitted to AI-powered features may be processed by these providers solely for the purpose of generating responses requested by you.",
      "We strive to minimize data shared with third-party AI providers whenever possible.",
    ],
  },
  {
    title: "Data Storage",
    body: [
      "User data is stored using secure cloud infrastructure and database providers.",
      "We take reasonable measures to protect user information, but no online service can guarantee absolute security.",
    ],
  },
  {
    title: "Sharing of Information",
    body: ["We may share information only when necessary to:"],
    items: [
      "Operate the platform",
      "Provide requested services",
      "Comply with legal obligations",
      "Protect users and platform security",
    ],
    note: "We do not sell user data.",
  },
  {
    title: "Your Rights",
    body: ["You may request to:"],
    items: [
      "Access your stored information",
      "Correct inaccurate information",
      "Delete your account and associated data",
    ],
    note: "Requests can be made by contacting us at findyourcommonthread@gmail.com.",
  },
  {
    title: "Children's Privacy",
    body: [
      "Common Thread is intended for high school students and other educational users. Users under the age required by applicable law should use the platform only with appropriate parental or guardian consent.",
    ],
  },
  {
    title: "Changes to this Policy",
    body: [
      "We may update this Privacy Policy periodically. Continued use of the platform after updates constitutes acceptance of the revised policy.",
    ],
  },
  {
    title: "Contact",
    body: ["Questions regarding this Privacy Policy may be directed to:"],
    email: "findyourcommonthread@gmail.com",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="flex-1 bg-ivory px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex rounded-full border border-border-soft bg-white px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
        >
          Back to Common Thread
        </Link>

        <header className="mt-8 border-b border-border-soft pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-forest-muted">
            Privacy Policy
          </p>
          <h1 className="mt-3 font-serif text-5xl tracking-tight text-foreground sm:text-6xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base text-text-tertiary">
            Last Updated: June 15, 2026
          </p>
        </header>

        <div className="divide-y divide-border-soft">
          {sections.map((section) => (
            <section key={section.title} className="py-8">
              <h2 className="font-serif text-3xl tracking-tight text-foreground">
                {section.title}
              </h2>

              {section.body?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-4 text-base leading-7 text-text-secondary"
                >
                  {paragraph}
                </p>
              ))}

              {section.groups?.map((group) => (
                <div key={group.title} className="mt-6">
                  <h3 className="text-base font-semibold text-foreground">
                    {group.title}
                  </h3>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-text-secondary">
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}

              {section.items ? (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-text-secondary">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}

              {section.note ? (
                <p className="mt-4 rounded-lg border border-border-soft bg-white px-4 py-3 text-base leading-7 text-text-secondary">
                  {section.note}
                </p>
              ) : null}

              {section.email ? (
                <a
                  href={`mailto:${section.email}`}
                  className="mt-4 inline-flex rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
                >
                  {section.email}
                </a>
              ) : null}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
