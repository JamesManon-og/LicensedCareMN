import Link from "next/link";
import { Brand } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="site">
      <div className="wrap footcols">
        <div>
          <Brand compact />
          <p className="footer-copy">
            Data is based on a Minnesota DHS public licensing launch snapshot. Licensed Care MN is not affiliated with or endorsed by DHS.
          </p>
        </div>
        <div>
          <div className="label">Browse</div>
          <Link href="/search">All providers</Link>
          <Link href="/guide">CRS guide</Link>
          <Link href="/faq">FAQ</Link>
        </div>
        <div>
          <div className="label">For providers</div>
          <Link href="/search">Find your listing</Link>
          <Link href="/login">Administrator sign in</Link>
        </div>
      </div>
      <div className="wrap footbottom">© {new Date().getFullYear()} Licensed Care MN · Launch directory snapshot</div>
    </footer>
  );
}
