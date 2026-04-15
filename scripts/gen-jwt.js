#!/usr/bin/env node

// QWeather Ed25519 JWT Generator — zero external dependencies
// Usage: node gen-jwt.js
// Reads config from environment variables, falls back to .env file in script directory.
// Output: JWT token string to stdout

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load .env file if environment variables are not set
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const projectId = process.env.QWEATHER_PROJECT_ID;
const credentialId = process.env.QWEATHER_CREDENTIAL_ID;
const privateKeyOrPath = process.env.QWEATHER_PRIVATE_KEY;

if (!projectId || !credentialId || !privateKeyOrPath) {
  console.error('Missing required environment variables:');
  if (!projectId) console.error('  - QWEATHER_PROJECT_ID');
  if (!credentialId) console.error('  - QWEATHER_CREDENTIAL_ID');
  if (!privateKeyOrPath) console.error('  - QWEATHER_PRIVATE_KEY');
  console.error('\nSet them in environment or create .env file (see .env.example)');
  process.exit(1);
}

const privateKeyPem = privateKeyOrPath.startsWith('-----BEGIN')
  ? privateKeyOrPath.replace(/\\n/g, '\n')
  : fs.readFileSync(privateKeyOrPath, 'utf8');

function base64url(buf) {
  return (Buffer.isBuffer(buf) ? buf : Buffer.from(buf))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const header = { alg: 'EdDSA', kid: credentialId };
const now = Math.floor(Date.now() / 1000);
const payload = { sub: projectId, iat: now - 30, exp: now + 3600 };

const signingInput = base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(payload));

const key = crypto.createPrivateKey(privateKeyPem.replace(/\\n/g, '\n'));
const signature = crypto.sign(null, Buffer.from(signingInput), key);

console.log(signingInput + '.' + base64url(signature));
