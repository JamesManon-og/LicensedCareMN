import Link from "next/link";

export default function NotFound() {
  return <section className="wrap page-section not-found"><span className="eyebrow">404</span><h1 className="display">We couldn’t find that provider page.</h1><p>The listing may not be part of this launch directory.</p><Link className="btn-primary" href="/search">Browse providers</Link></section>;
}
