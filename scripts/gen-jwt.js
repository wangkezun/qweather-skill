#!/usr/bin/env node

// QWeather Ed25519 JWT Generator — reuses shared library
// Usage: node gen-jwt.js
// Reads config from environment variables, falls back to .env file in script directory.
// Output: JWT token string to stdout

const { loadConfig, generateToken } = require('./lib/qweather');

const config = loadConfig();
console.log(generateToken(config));
