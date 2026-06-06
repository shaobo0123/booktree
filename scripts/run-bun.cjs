// Cross-platform helper to find Bun and run it with the given arguments
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const candidates = [
  path.join(os.homedir(), ".bun", "bin", "bun.exe"), // Windows
  path.join(os.homedir(), ".bun", "bin", "bun"),      // macOS / Linux
  "bun",                                                // fallback: system PATH
];

// Resolve --cwd to absolute path
const rawArgs = process.argv.slice(2);
const args = [];
let cwd = process.cwd();

for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === "--cwd" && i + 1 < rawArgs.length) {
    cwd = path.resolve(rawArgs[i + 1]);
    i++; // skip the value
  } else {
    args.push(rawArgs[i]);
  }
}

for (const bin of candidates) {
  if (bin !== "bun" && !fs.existsSync(bin)) continue;

  const p = spawn(bin, args, { stdio: "inherit", shell: false, cwd });

  p.on("error", () => {
    if (bin === candidates[candidates.length - 1]) {
      console.error("Bun not found. Install it: https://bun.sh");
      process.exit(1);
    }
  });

  p.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  return;
}

console.error("Bun not found. Install it: https://bun.sh");
process.exit(1);
