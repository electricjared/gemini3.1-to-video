#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

function shouldInstallChromium() {
  if (process.env.SKIP_PLAYWRIGHT_INSTALL === "1") return false;

  return (
    process.env.VERCEL === "1" ||
    process.env.CI === "true" ||
    process.env.INSTALL_PLAYWRIGHT_BROWSER === "1"
  );
}

if (!shouldInstallChromium()) {
  // eslint-disable-next-line no-console
  console.log("Skipping Playwright browser install (set INSTALL_PLAYWRIGHT_BROWSER=1 to force).");
  process.exit(0);
}

// Use hermetic install path so Chromium can be bundled with the deployment artifact.
const env = {
  ...process.env,
  PLAYWRIGHT_BROWSERS_PATH: "0",
};

// eslint-disable-next-line no-console
console.log("Installing Playwright Chromium browser...");

const result = spawnSync("npx", ["playwright", "install", "chromium"], {
  stdio: "inherit",
  env,
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
