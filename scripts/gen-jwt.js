#!/usr/bin/env node

// QWeather Ed25519 JWT Generator — zero external dependencies
// Usage: node gen-jwt.js <project_id> <credential_id> <private_key_or_path>
//   <private_key_or_path> can be:
//     - A file path to a PEM file (e.g., /path/to/ed25519-private.pem)
//     - PEM content directly (starting with "-----BEGIN")
// Output: JWT token string to stdout

const crypto = require('crypto');
const fs = require('fs');

const [,, projectId, credentialId, privateKeyOrPath] = process.argv;

if (!projectId || !credentialId || !privateKeyOrPath) {
  console.error('Usage: node gen-jwt.js <project_id> <credential_id> <private_key_or_path>');
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
