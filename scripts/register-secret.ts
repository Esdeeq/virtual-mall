/**
 * One-time entity secret registration script.
 * Run: bun run scripts/register-secret.ts
 * NEVER run this more than once per Circle entity — it overwrites the registered secret.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { registerEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets';

const apiKey = process.env.CIRCLE_API_KEY;
if (!apiKey) { console.error('CIRCLE_API_KEY not set'); process.exit(1); }

// Generate — captured into memory, never printed to stdout
const entitySecret = crypto.randomBytes(32).toString('hex');

const recoveryDir = '/home/user/app/.circle';
fs.mkdirSync(recoveryDir, { recursive: true });

console.log('Registering entity secret ciphertext with Circle…');
const response = await registerEntitySecretCiphertext({
  apiKey,
  entitySecret,
  recoveryFileDownloadPath: recoveryDir,
});

const recoveryPath = path.join(recoveryDir, 'recovery_file.dat');
if (response.data?.recoveryFile) {
  fs.writeFileSync(recoveryPath, response.data.recoveryFile, 'utf-8');
}

// Persist to .env
const envPath = '/home/user/app/.env';
fs.appendFileSync(envPath, `\nCIRCLE_ENTITY_SECRET=${entitySecret}\n`, 'utf-8');

console.log('OK: entity secret registered and written to .env');
console.log('OK: recovery file written to', recoveryPath);
console.log('Verifying…');

// Verify by listing wallet sets
const { initiateDeveloperControlledWalletsClient } = await import('@circle-fin/developer-controlled-wallets');
const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
await client.listWalletSets({ pageSize: 1 });
console.log('VERIFIED: entity secret is active and registered.');
