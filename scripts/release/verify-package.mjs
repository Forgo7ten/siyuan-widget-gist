import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WIDGET_PACKAGE_FILES } from "../build/package-zip.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const resolveRoot = (...segments) => path.join(root, ...segments);
const SEMVER_REGEX = /^[0-9]+\.[0-9]+\.[0-9]+$/;

const required = [
  ...WIDGET_PACKAGE_FILES.map(file => `dist/${file}`),
  "package.zip",
];

for (const relPath of required) {
  const fullPath = resolveRoot(relPath);
  assert.ok(existsSync(fullPath), `Missing build artifact: ${relPath}`);
  assert.ok(statSync(fullPath).size > 0, `Empty build artifact: ${relPath}`);
}

assert.ok(!existsSync(resolveRoot("icon.png")), "icon.png is generated only as a build artifact");
assert.ok(!existsSync(resolveRoot("preview.png")), "preview.png is generated only as a build artifact");

const pngMagic = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const icon = readFileSync(resolveRoot("dist/icon.png"));
assert.deepEqual(icon.subarray(0, 8), pngMagic, "dist/icon.png must have valid PNG header");
assert.equal(icon.readUInt32BE(16), 160, "marketplace icon width must be 160");
assert.equal(icon.readUInt32BE(20), 160, "marketplace icon height must be 160");
assert.ok(icon.byteLength <= 64 * 1024, "marketplace icon must be at most 64 KiB");

const preview = readFileSync(resolveRoot("dist/preview.png"));
assert.deepEqual(preview.subarray(0, 8), pngMagic, "dist/preview.png must have valid PNG header");
assert.equal(preview.readUInt32BE(16), 1024, "marketplace preview width must be 1024");
assert.equal(preview.readUInt32BE(20), 768, "marketplace preview height must be 768");
assert.ok(preview.byteLength <= 512 * 1024, "marketplace preview must be at most 512 KiB");

for (const readme of ["README.md", "README.zh-CN.md"]) {
  assert.match(readFileSync(resolveRoot(readme), "utf8"), /assets\/icon\.svg/);
}

const pkg = JSON.parse(readFileSync(resolveRoot("package.json"), "utf8"));
const rootManifest = JSON.parse(readFileSync(resolveRoot("widget.json"), "utf8"));
const distManifest = JSON.parse(readFileSync(resolveRoot("dist/widget.json"), "utf8"));
assert.equal(distManifest.name, "siyuan-widget-gist");
assert.equal(pkg.version, rootManifest.version, "package.json and widget.json version must match");
assert.equal(rootManifest.version, distManifest.version, "widget.json and dist/widget.json version must match");
assert.ok(SEMVER_REGEX.test(distManifest.version), `Invalid SemVer version: ${distManifest.version}`);
assert.equal(distManifest.minAppVersion, "3.7.0");
assert.equal(distManifest.icon, "icon.png");
assert.equal(distManifest.preview, "preview.png");

// Inspect ZIP central-directory names without any external runtime dependency.
const archive = readFileSync(resolveRoot("package.zip"));
let eocd = -1;
for (let offset = Math.max(0, archive.length - 22 - 0xffff); offset <= archive.length - 22; offset++) {
  if (archive.readUInt32LE(offset) === 0x06054b50) eocd = offset;
}
assert.notEqual(eocd, -1, "package.zip has no end-of-central-directory record");
const entryCount = archive.readUInt16LE(eocd + 10);
let cursor = archive.readUInt32LE(eocd + 16);
const zipEntries = [];
for (let index = 0; index < entryCount; index++) {
  assert.equal(archive.readUInt32LE(cursor), 0x02014b50, `Invalid ZIP entry ${index}`);
  const nameLength = archive.readUInt16LE(cursor + 28);
  const extraLength = archive.readUInt16LE(cursor + 30);
  const commentLength = archive.readUInt16LE(cursor + 32);
  zipEntries.push(archive.toString("utf8", cursor + 46, cursor + 46 + nameLength));
  cursor += 46 + nameLength + extraLength + commentLength;
}

assert.deepEqual(
  [...zipEntries].sort(),
  [...WIDGET_PACKAGE_FILES].sort(),
  "package.zip entries must match WIDGET_PACKAGE_FILES exactly"
);
assert.ok(!zipEntries.some(entry => entry.startsWith("node_modules/")), "package.zip must not contain node_modules");
assert.ok(!zipEntries.some(entry => entry.startsWith("docs/")), "package.zip must not contain internal docs/");
assert.ok(!zipEntries.some(entry => entry.startsWith("scripts/")), "package.zip must not contain scripts/");
console.log("siyuan-widget-gist package structure verified (dist/ and package.zip)");
