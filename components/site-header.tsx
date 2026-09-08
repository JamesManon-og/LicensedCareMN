import Link from "next/link";
import { Brand } from "@/components/brand";

const links = [
  ["/search", "Browse providers"],
  ["/guide", "CRS guide"],
  ["/faq", "FAQ"],
  ["/#about", "About"]
] as const;

export function SiteHeader() {
  return (
    <header className="site">
      <div className="headerbar">
        <Brand />
        <nav className="mainnav desktop-nav" aria-label="Primary navigation">
          {links.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
        <details className="mobile-nav">
          <summary aria-label="Open navigation menu">
            <span>Menu</span>
            <span aria-hidden="true">☰</span>
          </summary>
          <nav aria-label="Mobile navigation">
            {links.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}
          </nav>
        </details>
      </div>
    </header>
  );
}
