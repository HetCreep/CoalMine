// CoalMine configurator — edit .coalmine.json from the command line.
// Flags, parsing, validation, and help all come from one table
// (scripts/lib/config-schema.mjs, shared with verify.mjs): a key added there
// is automatically settable, validated, and documented here.
import fs from 'fs';
import path from 'path';
import { CONFIG_SCHEMA } from './lib/config-schema.mjs';
import { stripJsonc } from './lib/jsonc.mjs';

function findGitRoot(startDir) {
  let dir = path.resolve(startDir);
  while (true) {
    const gitPath = path.join(dir, '.git');
    if (fs.existsSync(gitPath)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return startDir;
}

function printHelp() {
  const lines = [
    'CoalMine Configurator Utility',
    'Usage: node scripts/configure.mjs [options]',
    '',
    'Options:',
  ];
  for (const spec of CONFIG_SCHEMA) {
    const flags = [`--${spec.key}`, ...(spec.flags || [])].join(', ');
    lines.push(`  ${flags.padEnd(48)} ${spec.help}`);
  }
  lines.push(`  ${'--help, -h'.padEnd(48)} Show this help message`);
  lines.push('');
  lines.push('Examples:');
  lines.push('  node scripts/configure.mjs --language th --file-cap 15');
  lines.push('  node scripts/configure.mjs --disable rot-canary,drift-canary');
  console.log(lines.join('\n'));
}

// Parse one raw CLI value against a spec. Returns { value } or { error }.
function parseValue(spec, raw) {
  switch (spec.type) {
    case 'bool': {
      if (raw !== 'true' && raw !== 'false') {
        return { error: `${spec.key} needs true or false` };
      }
      return { value: raw === 'true' };
    }
    case 'int': {
      const n = parseInt(raw, 10);
      if (isNaN(n)) return { error: `${spec.key} must be a number` };
      if (spec.min !== undefined && n < spec.min) return { error: `${spec.key} must be ≥ ${spec.min}` };
      return { value: n };
    }
    case 'enum': {
      const v = (raw || '').toLowerCase();
      if (!spec.values.includes(v)) {
        return { error: `${spec.key} must be one of: ${spec.values.join(', ')}` };
      }
      if (spec.titleCase && v !== 'auto') {
        return { value: v.charAt(0).toUpperCase() + v.slice(1) };
      }
      return { value: v };
    }
    case 'strArr': {
      if (raw === undefined) {
        return { error: `${spec.key} needs a comma-separated value (pass "" to clear the list)` };
      }
      if (raw === '' || raw === '""') return { value: [] };
      let items = raw.split(',').map((s) => s.trim()).filter(Boolean);
      if (spec.lower) items = items.map((s) => s.toLowerCase());
      return { value: items };
    }
    default:
      return { error: `internal: unknown spec type '${spec.type}'` };
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const root = findGitRoot(process.cwd());
  const configPath = path.join(root, '.coalmine.json');

  let cfg = {};
  let hadComments = false;
  // Read once via try/catch (no existsSync precheck) so there is no check-to-use gap.
  let rawConfig = null;
  try { rawConfig = fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''); } catch {}
  if (rawConfig !== null) {
    try {
      const content = rawConfig;
      hadComments = content.includes('//');
      const cleanJson = stripJsonc(content);
      cfg = JSON.parse(cleanJson) || {};
      // Migrate legacy/retired keys to their current forms.
      if (cfg.conductor !== undefined) {
        cfg.enableConductor = cfg.enableConductor ?? cfg.conductor;
        delete cfg.conductor;
      }
      if (cfg.disable !== undefined) {
        cfg.disabledCanaries = cfg.disabledCanaries ?? cfg.disable;
        delete cfg.disable;
      }
      if (cfg.mode !== undefined) {
        cfg.rotCanaryMode = cfg.rotCanaryMode ?? cfg.mode;
        delete cfg.mode;
      }
      if (cfg.antivirusStalenessDays !== undefined) {
        cfg.ruleRevalidateDays = cfg.ruleRevalidateDays ?? cfg.antivirusStalenessDays;
        delete cfg.antivirusStalenessDays;
      }
      if (cfg.tempSweepProbability !== undefined) {
        delete cfg.tempSweepProbability; // retired: the sweep is deterministically throttled (24h marker), per Phoenix #8
      }
      if (cfg.branchPrefix !== undefined) {
        delete cfg.branchPrefix;
      }
      if (cfg.pullRequestRemote !== undefined) {
        delete cfg.pullRequestRemote;
      }
    } catch (e) {
      try {
        fs.copyFileSync(configPath, configPath + '.bak');
        console.warn('Warning: existing .coalmine.json is malformed — backed it up to .coalmine.json.bak and rebuilding.');
      } catch {
        console.warn('Warning: existing .coalmine.json is malformed. Overwriting.');
      }
    }
  }

  // Flag lookup: --<key> plus every alias in the table.
  const flagMap = new Map();
  for (const spec of CONFIG_SCHEMA) {
    flagMap.set(`--${spec.key}`, spec);
    for (const f of spec.flags || []) flagMap.set(f, spec);
  }

  for (let i = 0; i < args.length; i++) {
    const spec = flagMap.get(args[i]);
    if (!spec) {
      console.error(`Error: Unrecognized option '${args[i]}'`);
      printHelp();
      process.exit(1);
    }
    const parsed = parseValue(spec, args[++i]);
    if (parsed.error) {
      console.error(`Error: ${parsed.error}`);
      process.exit(1);
    }
    cfg[spec.key] = parsed.value;
  }

  try {
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
    if (hadComments) {
      console.warn('Note: inline comments were stripped (this tool writes plain JSON). Every key stays documented in platform-configs/.coalmine.json.');
    }
    console.log(`Successfully updated configuration in: ${configPath}`);
    console.log(JSON.stringify(cfg, null, 2));
  } catch (e) {
    console.error(`Error: Failed to write to config file: ${e.message}`);
    process.exit(1);
  }
}

main();
