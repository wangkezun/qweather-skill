#!/usr/bin/env node

// Generate Ed25519 key pair for QWeather JWT authentication — zero external dependencies
// Usage: node gen-keys.js [output_dir]
//   output_dir: directory to save keys (default: current directory)
// Output: ed25519-private.pem and ed25519-public.pem

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const outputDir = process.argv[2] || '.';

fs.mkdirSync(outputDir, { recursive: true });

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });

const privatePath = path.join(outputDir, 'ed25519-private.pem');
const publicPath = path.join(outputDir, 'ed25519-public.pem');

fs.writeFileSync(privatePath, privatePem, { mode: 0o600 });
fs.writeFileSync(publicPath, publicPem, { mode: 0o644 });

process.stdout.write(
  `Keys generated:\n` +
  `  Private: ${privatePath}\n` +
  `  Public:  ${publicPath}\n\n` +
  `Next steps:\n` +
  `  1. Upload ${publicPath} to QWeather console\n` +
  `  2. Record the Credential ID\n` +
  `  3. Keep ${privatePath} secure, never commit it\n`
);
