import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // 상위 폴더의 다른 lockfile 대신 이 프로젝트를 루트로 사용
    root: __dirname,
  },
};

export default nextConfig;
