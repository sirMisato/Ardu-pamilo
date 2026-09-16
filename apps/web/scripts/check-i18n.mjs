import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const locales = ["id", "en"];
const messages = Object.fromEntries(await Promise.all(locales.map(async (locale) => {
  const raw = await readFile(path.join(root, "src", "i18n", `${locale}.json`), "utf8");
  return [locale, JSON.parse(raw)];
})));

const failures = [];
const flattened = Object.fromEntries(locales.map((locale) => [locale, flatten(messages[locale])]));

for (const locale of locales) {
  const other = locale === "id" ? "en" : "id";
  for (const key of Object.keys(flattened[other])) {
    if (!(key in flattened[locale])) {
      failures.push(`${locale} missing key ${key}`);
    }
  }

  for (const [key, value] of Object.entries(flattened[locale])) {
    if (typeof value !== "string" || value.trim() === "") {
      failures.push(`${locale}.${key} is empty or not a string`);
      continue;
    }

    const placeholders = extractPlaceholders(value);
    const counterpart = flattened[other][key];
    if (typeof counterpart === "string") {
      const otherPlaceholders = extractPlaceholders(counterpart);
      if (placeholders.join(",") !== otherPlaceholders.join(",")) {
        failures.push(`${key} placeholder mismatch: ${locale}={${placeholders.join(",")}} ${other}={${otherPlaceholders.join(",")}}`);
      }
    }
  }
}

const sourceFiles = await collectSourceFiles(path.join(root, "src"));
const usedKeys = new Set();
for (const file of sourceFiles) {
  const raw = await readFile(file, "utf8");
  const regex = /\b(?:t|tn)\(\s*["'`]([a-zA-Z0-9_.-]+)["'`]/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    usedKeys.add(match[1]);
  }
}

for (const key of usedKeys) {
  for (const locale of locales) {
    if (!(key in flattened[locale])) {
      failures.push(`used key ${key} missing in ${locale}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`i18n check passed: ${Object.keys(flattened.id).length} keys, ${usedKeys.size} used keys.`);

function flatten(value, prefix = "", output = {}) {
  for (const [key, child] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") {
      output[nextKey] = child;
    } else if (child && typeof child === "object" && !Array.isArray(child)) {
      flatten(child, nextKey, output);
    } else {
      output[nextKey] = child;
    }
  }
  return output;
}

function extractPlaceholders(value) {
  return [...value.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

async function collectSourceFiles(directory) {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(fullPath));
    } else if (/\.(ts|vue)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}
