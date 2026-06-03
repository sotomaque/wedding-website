import { fileURLToPath } from "node:url";
import createJiti from "jiti";
import createNextIntlPlugin from "next-intl/plugin";

const jiti = createJiti(fileURLToPath(import.meta.url));

// Import env here to validate during build
jiti("./env");

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  // isomorphic-dompurify pulls in jsdom (used only server-side to sanitize the
  // story rich text). jsdom does dynamic requires + optional native deps that
  // the Next bundler can't statically include, which breaks the build. Mark it
  // external so it's loaded from node_modules at runtime instead of bundled.
  serverExternalPackages: ["isomorphic-dompurify"],
  // Server Action body limit. Must live under `experimental.serverActions`
  // (the top-level `serverActions` key is silently ignored — Next.js logs
  // "Unrecognized key(s) in object: 'serverActions'" and falls back to the
  // 1MB default, so without this fix any payload >1MB hits the default cap
  // even though the code intends 10MB.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/f/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
