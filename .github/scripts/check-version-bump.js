// Derives the release version from apps/mobile/src/content/patchNotes.js instead
// of trusting a hand-edited apps/mobile/app.json — that file's `version` has to
// stay in lockstep with the newest patchNotes.js entry anyway (see
// usePatchNotes.js: the "what's new" popup only fires when they match), so
// patch notes are the single source of truth and this syncs app.json to it.
//
// The bump size (patch vs minor/major) is cross-checked against whether the
// newest entry lists any `features` — a fixes/styling-only entry must be a
// patch bump, one with features must be minor or major. This is what catches
// "auto-increment says 1.3.0 but it's really 1.2.1": if the version chosen in
// patchNotes.js doesn't match what the notes actually describe, this fails
// loudly instead of shipping a mislabeled release.
"use strict";
const fs = require("fs");
const path = require("path");

const appJsonPath = path.join(__dirname, "../../apps/mobile/app.json");
const patchNotesPath = path.join(__dirname, "../../apps/mobile/src/content/patchNotes.js");

const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
const previousVersion = appJson.expo.version;

const source = fs.readFileSync(patchNotesPath, "utf8");
const newestEntry = extractNewestEntry(source);

if (!newestEntry) {
  fail("Could not find any entries in PATCH_NOTES in patchNotes.js.");
}

const { versionText, hasFeatures } = newestEntry;

if (versionText === previousVersion) {
  fail(
    `patchNotes.js's newest entry is still "${versionText}", same as apps/mobile/app.json.\n` +
      "Add a new entry to the top of PATCH_NOTES describing this release before running this workflow."
  );
}

const bumpType = classifyBump(previousVersion, versionText);
if (!bumpType) {
  fail(`Newest patch notes version "${versionText}" is not a valid semver increment of "${previousVersion}".`);
}

if (hasFeatures && bumpType === "patch") {
  fail(
    `patchNotes.js's newest entry (${versionText}) lists new "features" but is only a patch bump over ${previousVersion}.\n` +
      "A release with new features needs a minor (or major) version bump."
  );
}
if (!hasFeatures && bumpType !== "patch") {
  fail(
    `patchNotes.js's newest entry (${versionText}) has no "features" (fixes/styling only) but is a ${bumpType} bump over ${previousVersion}.\n` +
      `Did you mean a patch release instead? (e.g. ${previousVersion.replace(/\d+$/, (n) => String(Number(n) + 1))})`
  );
}

appJson.expo.version = versionText;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");

console.log(`Version: ${previousVersion} -> ${versionText} (${bumpType})`);
const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  fs.appendFileSync(githubOutput, `version=${versionText}\nbump=${bumpType}\n`);
}

function extractNewestEntry(text) {
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
  if (!versionMatch) return null;

  const featuresMatch = entryText.match(/features:\s*\[/);
  const hasFeatures = !!featuresMatch && !/features:\s*\[\s*\]/.test(entryText);

  return { versionText: versionMatch[1], hasFeatures };
}

function classifyBump(previous, next) {
  const a = parseSemver(previous);
  const b = parseSemver(next);
  if (!a || !b) return null;
  if (b.major > a.major) return "major";
  if (b.major === a.major && b.minor > a.minor) return "minor";
  if (b.major === a.major && b.minor === a.minor && b.patch > a.patch) return "patch";
  return null;
}

function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function fail(message) {
  console.error("::error::" + message);
  process.exit(1);
}
