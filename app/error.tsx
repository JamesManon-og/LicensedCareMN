"use client";

import Link from "next/link";
import { useEffect } from "react";

// A page whose required data could not be read. In production the message is generic; the digest
// matches the full error in the server logs.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error.digest ? `Page failed to load (digest ${error.digest})` : error);
  }, [error]);

  return <section className="wrap page-section not-found"><span className="eyebrow">Temporarily unavailable</span><h1 className="display">Something went wrong loading this page.</h1><p>The directory data could not be read just now. Please try again in a moment.</p><div className="error-actions"><button className="btn-primary" type="button" onClick={() => retry()}>Try again</button><Link className="btn-secondary" href="/search">Browse providers</Link></div></section>;
}
