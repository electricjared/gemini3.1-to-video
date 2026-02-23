#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");
const { extractSvg, parseConvertOptions, sanitizeFileName } = require("../src/lib/options");
const { renderSvgToMp4 } = require("../src/lib/renderSvgToVideo");

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (!token.startsWith("--")) continue;

    const key = token.slice(2);
    const next = argv[i + 1];

    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }

  return args;
}

function printUsage() {
  // eslint-disable-next-line no-console
  console.log(`Usage:
  npm run convert -- --input ./samples/animation.svg --output ./output/animation.mp4 [options]

Options:
  --input <path>          Input file containing <svg> animation code (required)
  --output <path>         Output MP4 path (required)
  --width <px>            Output width (default: 1080)
  --height <px>           Output height (default: 1920)
  --durationSec <number>  Video duration in seconds (default: 6)
  --fps <number>          Frames per second (default: 30)
  --crf <12-35>           H.264 quality (lower = better quality, default: 20)
  --backgroundColor <hex> Background color for canvas (default: #ffffff)
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h || !args.input || !args.output) {
    printUsage();
    process.exit(args.help || args.h ? 0 : 1);
  }

  const rawInput = await fs.readFile(path.resolve(args.input), "utf8");
  const svgContent = extractSvg(rawInput);

  const options = parseConvertOptions(args);
  const outputPath = path.resolve(args.output);

  // If output ends with a directory separator, append a sanitized file name.
  const finalOutput = outputPath.endsWith(path.sep)
    ? path.join(outputPath, sanitizeFileName(options.outputFileName))
    : outputPath;

  // eslint-disable-next-line no-console
  console.log("Starting render...");
  const startedAt = Date.now();

  await renderSvgToMp4({
    svgContent,
    outputPath: finalOutput,
    width: options.width,
    height: options.height,
    durationSec: options.durationSec,
    fps: options.fps,
    crf: options.crf,
    backgroundColor: options.backgroundColor,
  });

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  // eslint-disable-next-line no-console
  console.log(`Done: ${finalOutput} (${seconds}s)`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error.message || error);
  process.exit(1);
});
