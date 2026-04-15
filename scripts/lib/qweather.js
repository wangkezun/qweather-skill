// QWeather shared library — zero external dependencies

const crypto = require('crypto');
const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function loadConfig() {
  // Load .env as fallback (env vars take priority)
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }

  const apiHost = process.env.QWEATHER_API_HOST;
  const projectId = process.env.QWEATHER_PROJECT_ID;
  const credentialId = process.env.QWEATHER_CREDENTIAL_ID;
  const privateKeyOrPath = process.env.QWEATHER_PRIVATE_KEY;

  const missing = [];
  if (!apiHost) missing.push('QWEATHER_API_HOST');
  if (!projectId) missing.push('QWEATHER_PROJECT_ID');
  if (!credentialId) missing.push('QWEATHER_CREDENTIAL_ID');
  if (!privateKeyOrPath) missing.push('QWEATHER_PRIVATE_KEY');

  if (missing.length) {
    console.error('Missing required environment variables: ' + missing.join(', '));
    console.error('Set them in environment or create .env file (see .env.example)');
    process.exit(1);
  }

  const privateKeyPem = privateKeyOrPath.startsWith('-----BEGIN')
    ? privateKeyOrPath.replace(/\\n/g, '\n')
    : fs.readFileSync(privateKeyOrPath, 'utf8');

  return { apiHost, projectId, credentialId, privateKeyPem };
}

function base64url(buf) {
  return (Buffer.isBuffer(buf) ? buf : Buffer.from(buf))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateToken(config) {
  const header = { alg: 'EdDSA', kid: config.credentialId };
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: config.projectId, iat: now - 30, exp: now + 3600 };
  const signingInput = base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(payload));
  const key = crypto.createPrivateKey(config.privateKeyPem);
  const signature = crypto.sign(null, Buffer.from(signingInput), key);
  return signingInput + '.' + base64url(signature);
}

function request(config, urlPath, query) {
  const token = generateToken(config);
  const params = new URLSearchParams(query).toString();
  const fullPath = params ? `${urlPath}?${params}` : urlPath;

  return new Promise((resolve, reject) => {
    const req = https.get({
      hostname: config.apiHost,
      path: fullPath,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept-Encoding': 'gzip',
      },
    }, (res) => {
      const chunks = [];
      const stream = res.headers['content-encoding'] === 'gzip'
        ? res.pipe(zlib.createGunzip())
        : res;

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        try {
          const data = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(data)}`));
          } else {
            resolve(data);
          }
        } catch {
          reject(new Error(`Failed to parse response: ${body.slice(0, 200)}`));
        }
      });
      stream.on('error', reject);
    });
    req.on('error', reject);
  });
}

module.exports = { loadConfig, generateToken, request };
