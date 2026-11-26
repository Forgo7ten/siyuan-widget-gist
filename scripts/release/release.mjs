import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SEMVER_REGEX = /^[0-9]+\.[0-9]+\.[0-9]+$/;

function runStep(name, command) {
  console.log("\n========================================");
  console.log(`▶ Step: ${name}`);
  console.log(`  Running: ${command}`);
  console.log("========================================");
  try {
    execSync(command, { cwd: root, stdio: "inherit" });
  } catch {
    console.error(`\n✖ Step failed: ${name}`);
    process.exit(1);
  }
}

export async function verifyVersions(projectRoot = root) {
  console.log("\n========================================");
  console.log("▶ Step 1: Verify version consistency and format");
  console.log("========================================");

  const pkg = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(projectRoot, "widget.json"), "utf8"));

  if (!pkg.version || !SEMVER_REGEX.test(pkg.version)) {
    throw new Error(`package.json version "${pkg.version}" does not conform to SemVer X.Y.Z`);
  }
  if (!manifest.version || !SEMVER_REGEX.test(manifest.version)) {
    throw new Error(`widget.json version "${manifest.version}" does not conform to SemVer X.Y.Z`);
  }
  if (pkg.version !== manifest.version) {
    throw new Error(`Version mismatch: package.json is ${pkg.version}, widget.json is ${manifest.version}`);
  }

  console.log(`✔ Verified version ${pkg.version} across package.json and widget.json`);
  return pkg.version;
}

export async function runReleasePipeline() {
  console.log("Starting siyuan-widget-gist Local Release Pipeline...");

  const version = await verifyVersions(root);
  const tag = `v${version}`;

  runStep("2. Syntax Check", "pnpm run check");
  runStep("3. Render Icons and Build Archive", "pnpm run build:fast");
  runStep("4. Package Verification", "pnpm run package:verify");
  runStep("5. Archive Integrity Test", "unzip -t package.zip");

  console.log("\n================================================================");
  console.log("✔ All release verification steps completed successfully!");
  console.log(`  Release Tag: ${tag} (Version: ${version})`);
  console.log("================================================================");
  console.log("\nNext Steps for Deployment:");
  console.log("\nOption A: Manual Release via GitHub Actions (Recommended)");
  console.log("  1. Commit and push version updates:");
  console.log("     git add package.json widget.json");
  console.log(`     git commit -m "chore(release): bump to ${version}"`);
  console.log("     git push origin main");
  console.log("  2. Navigate to GitHub Actions -> \"Release siyuan-widget-gist\" -> \"Run workflow\"");
  console.log("\nOption B: Direct Tag Push");
  console.log(`  git tag ${tag} && git push origin ${tag}`);
  console.log("================================================================\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runReleasePipeline().catch(err => {
    console.error(`Release pipeline failed: ${err.message}`);
    process.exit(1);
  });
}
