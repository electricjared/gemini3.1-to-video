const path = require("node:path");

const DEFAULT_OPTIONS = {
  width: 1080,
  height: 1920,
  durationSec: 6,
  fps: 30,
  crf: 20,
  backgroundColor: "#ffffff",
  outputFileName: "animation.mp4",
  stripText: false,
};

function parseNumber(value, fallback, min, max, integer = false) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = integer ? Number.parseInt(String(value), 10) : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return integer ? Math.round(parsed) : parsed;
}

function isHexColor(value) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return fallback;

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function sanitizeFileName(inputName) {
  const fallback = DEFAULT_OPTIONS.outputFileName;
  if (!inputName) return fallback;

  const cleaned = String(inputName)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+/, "");

  if (!cleaned) return fallback;
  const normalized = cleaned.toLowerCase().endsWith(".mp4") ? cleaned : `${cleaned}.mp4`;
  return path.basename(normalized);
}

function extractSvg(rawInput) {
  if (!rawInput || typeof rawInput !== "string") {
    throw new Error("No animation code provided.");
  }

  let candidate = rawInput.trim();

  const fencedMatch = candidate.match(/```(?:svg|xml|html)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    candidate = fencedMatch[1].trim();
  }

  const svgMatch = candidate.match(/<svg[\s\S]*<\/svg>/i);
  if (!svgMatch) {
    throw new Error("Input must contain one <svg>...</svg> animation.");
  }

  return svgMatch[0];
}

function normalizeTextSnippet(rawText) {
  return rawText
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function analyzeSvgText(svgContent, maxSnippets = 6) {
  const blockRegex = /<text\b[^>]*>([\s\S]*?)<\/text>/gi;
  const selfClosingRegex = /<text\b[^>]*\/>/gi;

  const snippets = [];
  let blockCount = 0;
  let match;

  while ((match = blockRegex.exec(svgContent)) !== null) {
    blockCount += 1;
    const snippet = normalizeTextSnippet(match[1]);
    if (snippet && snippets.length < maxSnippets) {
      snippets.push(snippet);
    }
  }

  const selfClosingCount = (svgContent.match(selfClosingRegex) || []).length;
  return {
    textBlockCount: blockCount + selfClosingCount,
    snippets,
  };
}

function stripSvgTextElements(svgContent) {
  const blockRegex = /<text\b[\s\S]*?<\/text>\s*/gi;
  const selfClosingRegex = /<text\b[^>]*\/>\s*/gi;

  const blockCount = (svgContent.match(blockRegex) || []).length;
  const selfClosingCount = (svgContent.match(selfClosingRegex) || []).length;
  const removedTextBlocks = blockCount + selfClosingCount;

  const strippedSvg = svgContent.replace(blockRegex, "").replace(selfClosingRegex, "");
  return {
    svgContent: strippedSvg,
    removedTextBlocks,
  };
}

function parseConvertOptions(input) {
  const options = {
    width: parseNumber(input.width, DEFAULT_OPTIONS.width, 256, 4096, true),
    height: parseNumber(input.height, DEFAULT_OPTIONS.height, 256, 4096, true),
    durationSec: parseNumber(input.durationSec ?? input.duration, DEFAULT_OPTIONS.durationSec, 1, 180, false),
    fps: parseNumber(input.fps, DEFAULT_OPTIONS.fps, 1, 60, true),
    crf: parseNumber(input.crf, DEFAULT_OPTIONS.crf, 12, 35, true),
    backgroundColor: isHexColor(String(input.backgroundColor || ""))
      ? String(input.backgroundColor)
      : DEFAULT_OPTIONS.backgroundColor,
    outputFileName: sanitizeFileName(input.fileName || input.outputFileName),
    stripText: parseBoolean(input.stripText, DEFAULT_OPTIONS.stripText),
  };

  return options;
}

module.exports = {
  DEFAULT_OPTIONS,
  analyzeSvgText,
  extractSvg,
  parseConvertOptions,
  stripSvgTextElements,
  sanitizeFileName,
};
