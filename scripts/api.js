#!/usr/bin/env node

// QWeather API CLI — zero external dependencies
// Usage: node api.js <command> [--flag=value ...]

const { loadConfig, request } = require('./lib/qweather');

// Parse --key=value args
function parseArgs(argv) {
  const flags = {};
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        flags[arg.slice(2, eqIndex)] = arg.slice(eqIndex + 1);
      } else {
        flags[arg.slice(2)] = true;
      }
    }
  }
  return flags;
}

function requireFlags(flags, required) {
  const missing = required.filter((f) => !flags[f]);
  if (missing.length) {
    console.error(`Missing required flags: ${missing.map((f) => '--' + f).join(', ')}`);
    process.exit(1);
  }
}

const commands = {
  'city-lookup': {
    desc: 'City lookup by name or coordinates',
    flags: '--location (required) [--adm] [--range] [--number] [--lang]',
    run(config, flags) {
      requireFlags(flags, ['location']);
      return request(config, '/geo/v2/city/lookup', {
        location: flags.location,
        ...(flags.adm && { adm: flags.adm }),
        ...(flags.range && { range: flags.range }),
        ...(flags.number && { number: flags.number }),
        lang: flags.lang || 'zh',
      });
    },
  },

  'weather-now': {
    desc: 'Real-time weather',
    flags: '--location (required) [--lang] [--unit]',
    run(config, flags) {
      requireFlags(flags, ['location']);
      return request(config, '/v7/weather/now', {
        location: flags.location,
        lang: flags.lang || 'zh',
        unit: flags.unit || 'm',
      });
    },
  },

  'weather-daily': {
    desc: 'Daily forecast (3/7/10/15/30 days)',
    flags: '--location (required) [--days=3] [--lang] [--unit]',
    run(config, flags) {
      requireFlags(flags, ['location']);
      const days = flags.days || '3';
      if (!['3', '7', '10', '15', '30'].includes(days)) {
        console.error('--days must be 3, 7, 10, 15, or 30');
        process.exit(1);
      }
      return request(config, `/v7/weather/${days}d`, {
        location: flags.location,
        lang: flags.lang || 'zh',
        unit: flags.unit || 'm',
      });
    },
  },

  'weather-hourly': {
    desc: 'Hourly forecast (24/72/168 hours)',
    flags: '--location (required) [--hours=24] [--lang] [--unit]',
    run(config, flags) {
      requireFlags(flags, ['location']);
      const hours = flags.hours || '24';
      if (!['24', '72', '168'].includes(hours)) {
        console.error('--hours must be 24, 72, or 168');
        process.exit(1);
      }
      return request(config, `/v7/weather/${hours}h`, {
        location: flags.location,
        lang: flags.lang || 'zh',
        unit: flags.unit || 'm',
      });
    },
  },

  'air-quality': {
    desc: 'Real-time air quality',
    flags: '--lat --lon (required) [--lang]',
    run(config, flags) {
      requireFlags(flags, ['lat', 'lon']);
      return request(config, `/airquality/v1/current/${flags.lat}/${flags.lon}`, {
        lang: flags.lang || 'zh',
      });
    },
  },

  'weather-alert': {
    desc: 'Weather alerts',
    flags: '--lat --lon (required) [--lang]',
    run(config, flags) {
      requireFlags(flags, ['lat', 'lon']);
      return request(config, `/weatheralert/v1/current/${flags.lat}/${flags.lon}`, {
        lang: flags.lang || 'zh',
      });
    },
  },

  'indices': {
    desc: 'Life indices (1-day forecast)',
    flags: '--location --type (required) [--lang]',
    run(config, flags) {
      requireFlags(flags, ['location', 'type']);
      return request(config, '/v7/indices/1d', {
        location: flags.location,
        type: flags.type,
        lang: flags.lang || 'zh',
      });
    },
  },

  'minutely': {
    desc: 'Minutely precipitation (China only)',
    flags: '--lat --lon (required) [--lang]',
    run(config, flags) {
      requireFlags(flags, ['lat', 'lon']);
      return request(config, '/v7/minutely/5m', {
        location: `${flags.lon},${flags.lat}`,
        lang: flags.lang || 'zh',
      });
    },
  },

  'sun': {
    desc: 'Sunrise and sunset',
    flags: '--location --date (required, yyyyMMdd)',
    run(config, flags) {
      requireFlags(flags, ['location', 'date']);
      return request(config, '/v7/astronomy/sun', {
        location: flags.location,
        date: flags.date,
      });
    },
  },

  'moon': {
    desc: 'Moonrise, moonset and phases',
    flags: '--location --date (required, yyyyMMdd) [--lang]',
    run(config, flags) {
      requireFlags(flags, ['location', 'date']);
      return request(config, '/v7/astronomy/moon', {
        location: flags.location,
        date: flags.date,
        lang: flags.lang || 'zh',
      });
    },
  },
};

function printHelp() {
  console.log('Usage: node api.js <command> [--flag=value ...]\n');
  console.log('Commands:');
  for (const [name, cmd] of Object.entries(commands)) {
    console.log(`  ${name.padEnd(18)} ${cmd.desc}`);
    console.log(`  ${''.padEnd(18)} ${cmd.flags}`);
  }
}

async function main() {
  const command = process.argv[2];

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(command ? 0 : 1);
  }

  if (!commands[command]) {
    console.error(`Unknown command: ${command}\n`);
    printHelp();
    process.exit(1);
  }

  const config = loadConfig();
  const flags = parseArgs(process.argv.slice(3));

  try {
    const result = await commands[command].run(config, flags);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
