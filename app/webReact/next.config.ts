import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  transpilePackages: ["shared-logic"],
  turbopack: { root: resolve(process.cwd(), "../..") },
  images: { unoptimized: true },
};

export default nextConfig;
