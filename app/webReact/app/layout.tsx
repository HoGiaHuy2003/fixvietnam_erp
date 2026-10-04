import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HybridWebShell } from "./hybrid-web-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FixVietnam ERP",
    template: "%s | FixVietnam ERP",
  },
  description: "Không gian làm việc FixVietnam ERP.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <HybridWebShell>{children}</HybridWebShell>
      </body>
    </html>
  );
}
