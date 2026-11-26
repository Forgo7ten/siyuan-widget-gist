import { randomUUID } from "node:crypto";
import { access, copyFile, lstat, mkdir, readFile, realpath, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WIDGET_PACKAGE_FILES } from "../build/package-zip.mjs";

const widgetName = "siyuan-widget-gist";
const scriptPath = fileURLToPath(import.meta.url);
const sourceDir = path.resolve(path.dirname(scriptPath), "../../dist");

async function requireRealDirectory(target, workspaceRoot) {
  const info = await lstat(target).catch(() => null);
  if (!info?.isDirectory() || info.isSymbolicLink()) {
    throw new Error(`required real directory is missing or is a symlink: ${target}`);
  }
  const resolved = await realpath(target);
  const relative = path.relative(workspaceRoot, resolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`path resolves outside the workspace: ${target} -> ${resolved}`);
  }
  return resolved;
}

async function readWidgetManifest(directory) {
  const manifestPath = path.join(directory, "widget.json");
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error(`Unable to read widget manifest: ${manifestPath}`, { cause: error });
  }
}

export async function installWorkspace(workspaceArg, { buildDir = sourceDir, log = console.log } = {}) {
  if (!workspaceArg) {
    throw new Error('pass the SiYuan workspace root, for example: pnpm run install:workspace -- "/path/to/SiYuan/workspace"');
  }

  let stagePath;
  let backupPath;
  let targetDir;
  let backedUpExisting = false;
  let published = false;

  try {
    const requestedWorkspace = path.resolve(workspaceArg);
    const workspaceInfo = await lstat(requestedWorkspace).catch(() => null);
    if (!workspaceInfo?.isDirectory() || workspaceInfo.isSymbolicLink()) {
      throw new Error(`workspace root is not a real directory: ${requestedWorkspace}`);
    }
    const workspace = await realpath(requestedWorkspace);
    await requireRealDirectory(path.join(workspace, "conf"), workspace);
    const dataDir = await requireRealDirectory(path.join(workspace, "data"), workspace);
    await requireRealDirectory(path.join(dataDir, ".siyuan"), workspace);

    const widgetsPath = path.join(dataDir, "widgets");
    const widgetsInfo = await lstat(widgetsPath).catch(err => (err.code === "ENOENT" ? null : Promise.reject(err)));
    if (!widgetsInfo) {
      await mkdir(widgetsPath, { recursive: true });
    }
    const widgetsDir = await requireRealDirectory(widgetsPath, workspace);

    targetDir = path.join(widgetsDir, widgetName);
    const targetInfo = await lstat(targetDir).catch(error => (error.code === "ENOENT" ? null : Promise.reject(error)));
    if (targetInfo?.isSymbolicLink()) throw new Error(`refusing symlink widget target: ${targetDir}`);
    if (targetInfo && !targetInfo.isDirectory()) throw new Error(`widget target exists and is not a directory: ${targetDir}`);
    if (targetInfo) {
      const installedManifest = await readWidgetManifest(targetDir);
      if (installedManifest?.name !== widgetName) {
        throw new Error(`existing target does not identify as ${widgetName}; left untouched: ${targetDir}`);
      }
    }

    for (const file of WIDGET_PACKAGE_FILES) {
      await access(path.join(buildDir, file)).catch(() => {
        throw new Error(`build is missing ${file}; run pnpm run build first: ${buildDir}`);
      });
    }
    const builtManifest = await readWidgetManifest(buildDir);
    if (builtManifest?.name !== widgetName) throw new Error(`build manifest does not identify as ${widgetName}`);

    const suffix = `${Date.now()}-${randomUUID()}`;
    stagePath = path.join(widgetsDir, `.${widgetName}.install-${suffix}`);
    await mkdir(stagePath);
    for (const file of WIDGET_PACKAGE_FILES) {
      const dstFile = path.join(stagePath, file);
      await mkdir(path.dirname(dstFile), { recursive: true });
      await copyFile(path.join(buildDir, file), dstFile);
    }

    if (targetInfo) {
      backupPath = path.join(widgetsDir, `${widgetName}.backup-${suffix}`);
      await rename(targetDir, backupPath);
      backedUpExisting = true;
    }
    await rename(stagePath, targetDir);
    stagePath = undefined;
    published = true;

    log(`Installed ${widgetName} to: ${targetDir}`);
    if (backupPath) log(`Previous widget preserved at: ${backupPath}`);
    log("Refresh the note or insert the widget via /挂件 -> GitHub Gist in SiYuan.");
  } catch (error) {
    if (stagePath) await rm(stagePath, { recursive: true, force: true }).catch(() => {});
    if (backedUpExisting && !published) {
      await rename(backupPath, targetDir).catch(restoreError => {
        log(`Restore failed; the previous widget remains at ${backupPath}: ${restoreError.message}`);
      });
    }
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(scriptPath)) {
  installWorkspace(process.argv[2]).catch(error => {
    console.error(`Install failed: ${error.message}`);
    process.exitCode = 1;
  });
}
