// Run by the husky pre-commit hook. If this commit touches
// apps/mobile/src/content/patchNotes.js, takes the version from the newest
// PATCH_NOTES entry and writes it into apps/mobile/app.json (bumping
// android.versionCode alongside it) and the APK_VERSION shown on the
// download page, then stages all of it. This is the single place the app
// version gets bumped — patch notes are the source of truth, and nothing
// else (CI included, see apps/mobile/eas.json's autoIncrement: false)
// derives or increments it.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const repoRoot = path.join(__dirname, "..");
const patchNotesRelPath = "apps/mobile/src/content/patchNotes.js";
const appJsonRelPath = "apps/mobile/app.json";
const webPageRelPath = "apps/web/app/page.js";

const stagedFiles = execFileSync("git", ["diff", "--cached", "--name-only"], {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

if (!stagedFiles.includes(patchNotesRelPath)) {
  process.exit(0);
}

const patchNotesSource = execFileSync("git", ["show", `:${patchNotesRelPath}`], {
  cwd: repoRoot,
  encoding: "utf8",
});

const newestVersion = extractNewestVersion(patchNotesSource);
if (!newestVersion) {
  fail(`Could not find any entries in PATCH_NOTES in ${patchNotesRelPath}.`);
}

const appJsonPath = path.join(repoRoot, appJsonRelPath);
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

if (appJson.expo.version === newestVersion) {
  process.exit(0);
}

appJson.expo.version = newestVersion;
appJson.expo.android.versionCode = (appJson.expo.android.versionCode || 0) + 1;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");

const webPagePath = path.join(repoRoot, webPageRelPath);
const webPageSource = fs.readFileSync(webPagePath, "utf8");
const updatedWebPageSource = webPageSource.replace(
  /const APK_VERSION = "[^"]*";/,
  `const APK_VERSION = "${newestVersion}";`
);
fs.writeFileSync(webPagePath, updatedWebPageSource);

execFileSync("git", ["add", appJsonRelPath, webPageRelPath], { cwd: repoRoot });

console.log(
  `patchNotes.js changed — synced app version to ${newestVersion} (versionCode ${appJson.expo.android.versionCode}).`
);

function extractNewestVersion(text) {
  const arrayStart = text.indexOf("PATCH_NOTES = [");
  if (arrayStart === -1) return null;
  const braceStart = text.indexOf("{", arrayStart);
  if (braceStart === -1) return null;

  let depth = 0;
  let end = -1;
  for (let i = braceStart; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;

  const entryText = text.slice(braceStart, end + 1);
  const versionMatch = entryText.match(/version:\s*"([^"]+)"/);
  return versionMatch ? versionMatch[1] : null;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
