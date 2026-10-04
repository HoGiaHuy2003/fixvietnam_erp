import type { Metadata } from "next";
import { CatalogSearch } from "./search";

function catalogCanonical(): string | undefined {
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) return undefined;
  try {
    const url = new URL(siteUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return new URL("/catalog/", url).toString();
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  title: "Danh mục sản phẩm",
  description: "Tra cứu danh mục sản phẩm mẫu của FixVietnam ERP theo mã hoặc tên.",
  alternates: { canonical: catalogCanonical() },
};

export default function CatalogPage() {
  return (
    <div className="page-container">
      <header className="page-intro">
        <p className="eyebrow">Danh mục mẫu</p>
        <h1>Danh mục sản phẩm</h1>
        <p>Tra cứu nhanh theo mã hoặc tên sản phẩm. Dữ liệu dưới đây chỉ để minh họa cách hiển thị danh mục.</p>
      </header>
      <CatalogSearch />
    </div>
  );
}
