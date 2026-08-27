import type { NextConfig } from "next";
import { join } from "path";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  turbopack: {
    root: join(__dirname, ".."),
  },
};

export default nextConfig;
