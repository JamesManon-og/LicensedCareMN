import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="logo" href="/" aria-label="Licensed Care MN home">
      <span className="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="17" height="17">
          <circle cx="15" cy="23" r="10.5" fill="#ffffff" fillOpacity="0.95" />
          <circle cx="25" cy="23" r="10.5" fill="#da291c" />
          <path d="M20 13 27.5 22h-15Z" fill="#1a2540" />
        </svg>
      </span>
      <span>
        <span className="logo-word">Licensed Care MN</span>
        {!compact && <span className="logo-sub">CRS PROVIDER DIRECTORY</span>}
      </span>
    </Link>
  );
}
