import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Frequently asked questions", description: "Answers to common questions about the Licensed Care MN launch directory." };

const faqs = [
  ["Is Licensed Care MN affiliated with Minnesota DHS?", "No. The directory uses a public DHS-derived launch dataset but is not affiliated with or endorsed by Minnesota DHS."],
  ["Is the license status live?", "No. V1 is a fixed launch snapshot. Always confirm a provider’s current status directly with Minnesota DHS."],
  ["Why does a listing say unclaimed?", "Unclaimed means a provider representative has not yet completed the directory’s review process. It does not imply anything about the provider’s license or quality."],
  ["Can a provider correct a listing?", "A provider representative can submit a claim request from the provider profile. DHS-sourced licensing facts remain separate from provider-supplied content."],
  ["Does the directory show availability?", "No. Contact the provider directly to ask about availability, eligibility, and referral steps."]
];

export default function FaqPage() {
  return <section className="wrap prose-page page-section"><span className="eyebrow">FAQ</span><h1 className="display">Questions about the directory</h1><div className="faq-list">{faqs.map(([question, answer]) => <details className="card" key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div><div className="snapshot-notice"><strong>Still looking?</strong><p>Use the directory to find providers by county and service type.</p><Link className="btn-primary" href="/search">Browse providers</Link></div></section>;
}
