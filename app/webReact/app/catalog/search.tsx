"use client";

import { useMemo, useState } from "react";
import { WebCatalogSearch } from "shared-logic";

const products = [
  { sku: "SP-001", name: "Bộ dụng cụ sửa chữa", unit: "Bộ" },
  { sku: "SP-002", name: "Găng tay bảo hộ", unit: "Đôi" },
  { sku: "SP-003", name: "Đèn làm việc", unit: "Cái" },
] as const;

const search = new WebCatalogSearch();

export function CatalogSearch() {
  const [query, setQuery] = useState("");
  const matching = useMemo(
    () => products.filter((product) => search.matches(product.sku, product.name, query)),
    [query],
  );

  return (
    <section aria-labelledby="catalog-search-title" className="catalog-section">
      <h2 id="catalog-search-title">Tra cứu sản phẩm</h2>
      <div className="search-control">
        <label htmlFor="catalog-query">Mã hoặc tên sản phẩm</label>
        <input
          id="catalog-query"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ví dụ: SP-001 hoặc găng tay"
          autoComplete="off"
        />
      </div>
      <p className="result-count" role="status" aria-live="polite">
        {matching.length} sản phẩm phù hợp
      </p>
      {matching.length > 0 ? (
        <div className="table-scroll">
          <table>
            <caption>Danh sách sản phẩm mẫu</caption>
            <thead>
              <tr><th scope="col">Mã sản phẩm</th><th scope="col">Tên sản phẩm</th><th scope="col">Đơn vị</th></tr>
            </thead>
            <tbody>
              {matching.map((product) => (
                <tr key={product.sku}>
                  <th scope="row">{product.sku}</th>
                  <td>{product.name}</td>
                  <td>{product.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p>Không tìm thấy sản phẩm phù hợp. Hãy thử mã hoặc tên khác.</p>}
    </section>
  );
}
