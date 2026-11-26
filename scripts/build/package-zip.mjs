import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * 挂件打包产物映射表：
 * - 根目录源码与说明文件直接复制；
 * - icon.png / preview.png 从构建生成的 .generated/ 目录复制；
 * - assets/icon.svg 一并打入包内供 README 与集市详情页离线渲染徽标。
 */
export const WIDGET_ARTIFACT_SOURCES = [
  { entry: "widget.json", source: "widget.json" },
  { entry: "index.html", source: "index.html" },
  { entry: "style.css", source: "style.css" },
  { entry: "main.js", source: "main.js" },
  { entry: "src/url.js", source: "src/url.js" },
  { entry: "src/sandbox-doc.js", source: "src/sandbox-doc.js" },
  { entry: "src/host.js", source: "src/host.js" },
  { entry: "src/loader.js", source: "src/loader.js" },
  { entry: "icon.png", source: ".generated/icon.png" },
  { entry: "preview.png", source: ".generated/preview.png" },
  { entry: "assets/icon.svg", source: "assets/icon.svg" },
  { entry: "README.md", source: "README.md" },
  { entry: "README.zh-CN.md", source: "README.zh-CN.md" },
  { entry: "LICENSE", source: "LICENSE" },
];

export const WIDGET_PACKAGE_FILES = WIDGET_ARTIFACT_SOURCES.map(item => item.entry);

function toDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getUTCFullYear());
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = Math.floor(date.getUTCSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  return { dosTime, dosDate };
}

/**
 * 纯 Node 内置模块构建标准 ZIP 归档。
 */
export function createZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosTime, dosDate } = toDosDateTime();

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name.replace(/\\/g, "/"), "utf8");
    const rawData = entry.data;
    const checksum = crc32(rawData) >>> 0;
    const deflated = deflateRawSync(rawData, { level: 9 });
    const useDeflate = deflated.length < rawData.length;
    const payload = useDeflate ? deflated : rawData;
    const method = useDeflate ? 8 : 0;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(rawData.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, payload);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(rawData.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, eocd]);
}

export function buildPackage(projectRoot = root, { log = console.log } = {}) {
  const distDir = path.join(projectRoot, "dist");
  const zipPath = path.join(projectRoot, "package.zip");

  rmSync(distDir, { recursive: true, force: true });
  rmSync(zipPath, { force: true });
  mkdirSync(distDir, { recursive: true });

  const entries = [];
  for (const { entry, source } of WIDGET_ARTIFACT_SOURCES) {
    const srcPath = path.join(projectRoot, source);
    if (!existsSync(srcPath) || statSync(srcPath).size === 0) {
      throw new Error(
        `Missing or empty required artifact source: ${source} (run "pnpm run render:icons" first)`
      );
    }
    const dstPath = path.join(distDir, entry);
    mkdirSync(path.dirname(dstPath), { recursive: true });
    copyFileSync(srcPath, dstPath);
    entries.push({
      name: entry,
      data: readFileSync(srcPath),
    });
  }

  const zipBuffer = createZipBuffer(entries);
  writeFileSync(zipPath, zipBuffer);

  log(`Built dist/ (${entries.length} files) and package.zip (${zipBuffer.byteLength} bytes)`);
  return { distDir, zipPath, size: zipBuffer.byteLength };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    buildPackage();
  } catch (error) {
    console.error(`Build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
