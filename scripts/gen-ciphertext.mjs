import fs from 'node:fs';
import crypto from 'node:crypto';

const env = fs.readFileSync('/home/user/app/.env', 'utf-8');
for (const l of env.split('\n')) {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
  if (m) process.env[m[1]] = m[2];
}

const { generateEntitySecretCiphertext } = await import('@circle-fin/developer-controlled-wallets');

// Generate fresh 32-byte entity secret
const entitySecret = crypto.randomBytes(32).toString('hex');

// generateEntitySecretCiphertext fetches Circle's public key and encrypts
const ciphertext = await generateEntitySecretCiphertext(entitySecret, process.env.CIRCLE_API_KEY);

// Print ciphertext (safe — this is the encrypted value to paste in Circle Console)
console.log('\n=== PASTE THIS IN CIRCLE CONSOLE ===');
console.log(ciphertext);
console.log('=====================================\n');

// Save the plaintext secret to .env (never print it)
const envContent = fs.readFileSync('/home/user/app/.env', 'utf-8');
const newEnv = envContent.includes('CIRCLE_ENTITY_SECRET=')
  ? envContent.replace(/CIRCLE_ENTITY_SECRET=.*/g, 'CIRCLE_ENTITY_SECRET=' + entitySecret)
  : envContent + '\nCIRCLE_ENTITY_SECRET=' + entitySecret + '\n';
fs.writeFileSync('/home/user/app/.env', newEnv);
console.log('Entity secret saved to .env');
