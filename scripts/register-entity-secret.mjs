import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

// Load .env manually
const envRaw = fs.readFileSync("/home/user/app/.env", "utf-8");
for (const line of envRaw.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const entitySecret = crypto.randomBytes(32).toString("hex");

const recoveryDir = "/home/user/app/.circle";
fs.mkdirSync(recoveryDir, { recursive: true });

const response = await registerEntitySecretCiphertext({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret,
  recoveryFileDownloadPath: recoveryDir,
});

const recoveryPath = path.join(recoveryDir, "recovery_file.dat");
if (response.data?.recoveryFile) {
  fs.writeFileSync(recoveryPath, response.data.recoveryFile);
}

// Persist to .env — never print the value
const envPath = "/home/user/app/.env";
const envContent = fs.readFileSync(envPath, "utf-8");
if (envContent.includes("CIRCLE_ENTITY_SECRET=")) {
  fs.writeFileSync(envPath, envContent.replace(/CIRCLE_ENTITY_SECRET=.*/g, `CIRCLE_ENTITY_SECRET=${entitySecret}`));
} else {
  fs.appendFileSync(envPath, `\nCIRCLE_ENTITY_SECRET=${entitySecret}\n`);
}

// Verify
const { initiateDeveloperControlledWalletsClient } = await import("@circle-fin/developer-controlled-wallets");
const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret,
});
await client.listWalletSets({ pageSize: 1 });

console.log("ENTITY_SECRET_REGISTERED_OK");
console.log("RECOVERY_PATH:" + recoveryPath);
