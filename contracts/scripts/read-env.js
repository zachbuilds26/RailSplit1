const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

function readEnvValue(name, fileNames = [".env"]) {
  if (process.env[name]) return process.env[name];

  for (const fileName of fileNames) {
    for (const envPath of [join(__dirname, "..", fileName), join(__dirname, "..", "..", fileName)]) {
      if (!existsSync(envPath)) continue;

      for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const match = new RegExp(`^\\s*${name}\\s*=\\s*(.+?)\\s*$`).exec(line);
        if (match) return match[1].replace(/^["']|["']$/g, "");
      }
    }
  }

  return undefined;
}

module.exports = { readEnvValue };
