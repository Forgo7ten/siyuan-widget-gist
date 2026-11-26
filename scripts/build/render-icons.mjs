import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outputDir = path.join(root, ".generated");

async function renderSvgToPng({ inputRelPath, outputName, width, height, maxBytes }) {
  const inputPath = path.join(root, inputRelPath);
  const rawSvg = (await readFile(inputPath, "utf8")).trim();

  const rendered = new Resvg(rawSvg, {
    fitTo: { mode: "width", value: width },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: "Liberation Sans",
      sansSerifFamily: "Liberation Sans",
      monospaceFamily: "DejaVu Sans Mono",
    },
  }).render();

  const png = rendered.asPng();
  if (rendered.width !== width || rendered.height !== height) {
    throw new Error(`Expected ${width}x${height} for ${outputName}, got ${rendered.width}x${rendered.height}`);
  }
  if (png.byteLength > maxBytes) {
    throw new Error(`${outputName} exceeds ${maxBytes} bytes: ${png.byteLength}`);
  }

  const outputPath = path.join(outputDir, outputName);
  await writeFile(outputPath, png);
  console.log(`Rendered ${inputRelPath} -> .generated/${outputName} (${png.byteLength} bytes, ${width}x${height})`);
}

await mkdir(outputDir, { recursive: true });
await renderSvgToPng({
  inputRelPath: "assets/icon.svg",
  outputName: "icon.png",
  width: 160,
  height: 160,
  maxBytes: 64 * 1024,
});
await renderSvgToPng({
  inputRelPath: "assets/preview.svg",
  outputName: "preview.png",
  width: 1024,
  height: 768,
  maxBytes: 512 * 1024,
});
