"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

const REACT_ROUTES = new Set(["/catalog/"]);
const WASM_SOURCE = "/compose/wasm/index.html";
const JS_SOURCE = "/compose/js/index.html";

function normalizedPath(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

export function HybridWebShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isComposeRoute = pathname === "/";
  const [composeSource, setComposeSource] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (isComposeRoute && composeSource === null) {
      setComposeSource(new URLSearchParams(window.location.search).get("engine") === "js" ? JS_SOURCE : WASM_SOURCE);
    }
  }, [isComposeRoute, composeSource]);

  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      mainRef.current?.focus();
    }
  }, [pathname]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow || event.origin !== window.location.origin) return;
      const data: unknown = event.data;
      if (typeof data !== "object" || data === null) return;
      const message = data as { type?: unknown; path?: unknown };
      if (message.type !== "fixvietnam:open-react-page" || typeof message.path !== "string") return;
      const destination = normalizedPath(message.path);
      if (REACT_ROUTES.has(destination)) router.push(destination);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  return (
    <>
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <header className="site-header">
        <nav aria-label="Điều hướng chính">
          <Link href="/" aria-current={isComposeRoute ? "page" : undefined}>Không gian làm việc</Link>
          <Link href="/catalog/" aria-current={normalizedPath(pathname) === "/catalog/" ? "page" : undefined}>Danh mục sản phẩm</Link>
        </nav>
      </header>
      <main id="main-content" ref={mainRef} tabIndex={-1} className={isComposeRoute ? "main main-compose" : "main"}>
        {composeSource !== null && (
          <div className="compose-frame-wrap" hidden={!isComposeRoute}>
            <iframe
              ref={iframeRef}
              src={composeSource}
              title="Không gian làm việc FixVietnam ERP"
              className="compose-frame"
            />
          </div>
        )}
        {isComposeRoute && composeSource === null && <p className="loading">Đang mở không gian làm việc…</p>}
        {isComposeRoute && (
          <p className="compose-fallback">
            Giao diện không mở được? <a href="/?engine=js">Thử chế độ tương thích</a> hoặc <a href={WASM_SOURCE}>mở trực tiếp</a>.
          </p>
        )}
        {!isComposeRoute && children}
      </main>
    </>
  );
}
