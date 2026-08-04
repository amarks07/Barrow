/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Silences Next's workspace-root inference warning — the repo root (with
  // its single npm-workspaces lockfile) is the actual monorepo root.
  turbopack: {
    root: require("path").join(__dirname, "../.."),
  },
};

module.exports = nextConfig;
