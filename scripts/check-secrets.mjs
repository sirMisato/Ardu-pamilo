import { readFileSync } from "node:fs";
import { extname, relative } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { readdirSync, statSync } from "node:fs";

const root = fileURLToPath(new URL("../", import.meta.url));
const ignoredDirectories = new Set([".git", "node_modules", "dist", "coverage", ".vite"]);
const ignoredFiles = new Set(["package-lock.json"]);
const textExtensions = new Set([
  ".css",
  ".env",
  ".example",
  ".html",
  ".hocon",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".conf",
  ".sh",
  ".ts",
  ".yml",
  ".yaml"
]);

const patterns = [
  {
    name: "private-key",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/
  },
  {
    name: "aws-access-key",
    regex: /AKIA[0-9A-Z]{16}/
  },
  {
    name: "github-token",
    regex: /gh[pousr]_[A-Za-z0-9_]{36,}/
  },
  {
    name: "database-url-with-password",
    regex: /mysql:\/\/[^:\s]+:[^@\s]+@/i
  },
  {
    name: "mqtt-url-with-password",
    regex: /mqtts?:\/\/[^:\s]+:[^@\s]+@/i
  }
];

function walk(directory) {
  const entries = readdirSync(directory);
  const files = [];

  for (const entry of entries) {
    if (ignoredDirectories.has(entry)) {
      continue;
    }

    const fullPath = `${directory}/${entry}`;
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (ignoredFiles.has(entry)) {
      continue;
    }

    const extension = extname(entry);
    if (textExtensions.has(extension) || entry === ".env.example" || entry.startsWith("Dockerfile")) {
      files.push(fullPath);
    }
  }

  return files;
}

const findings = [];

for (const file of walk(root)) {
  const content = readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        findings.push({
          file: relative(root, file),
          line: index + 1,
          pattern: pattern.name
        });
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Potential secrets found:");
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} ${finding.pattern}`);
  }
  process.exit(1);
}

console.log("No obvious secrets found.");
