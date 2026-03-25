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
