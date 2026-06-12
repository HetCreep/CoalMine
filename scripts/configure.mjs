import fs from 'fs';
import path from 'path';

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
  console.log(`CoalMine Configurator Utility
Usage: node scripts/configure.mjs [options]

Options:
  --language, -l <lang>               Set language override (th, en, ja, zh, es)
  --autoScanFileCap, -c <num>         Set automatic file cap (default: 10)
  --tempSweepProbability, -p <num>    Set temp file sweep probability (0.0 to 1.0, default: 0.05)
  --tripwireMaxFileSizeKb, -s <num>   Set maximum file size in KB for tripwire scan (default: 100)
  --conductor, -d <true|false>        Enable or disable conductor rules injection
  --disable, -x <skills...>           Comma-separated list of skills to disable (or "all")
  --help, -h                          Show this help message

Examples:
  node scripts/configure.mjs --language th --file-cap 15
  node scripts/configure.mjs --disable rot-canary,drift-canary
`);
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
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '');
      cfg = JSON.parse(content) || {};
    } catch (e) {
      console.warn('Warning: existing .coalmine.json is malformed. Overwriting.');
    }
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--language' || arg === '-l') {
      const val = args[++i];
      if (!['th', 'en', 'ja', 'zh', 'es'].includes(val?.toLowerCase())) {
        console.error('Error: Language must be one of: th, en, ja, zh, es');
        process.exit(1);
      }
      cfg.language = val.toLowerCase();
    } else if (arg === '--autoScanFileCap' || arg === '-c' || arg === '--file-cap') {
      const val = parseInt(args[++i], 10);
      if (isNaN(val)) {
        console.error('Error: autoScanFileCap must be a number');
        process.exit(1);
      }
      cfg.autoScanFileCap = val;
    } else if (arg === '--tempSweepProbability' || arg === '-p' || arg === '--sweep-prob') {
      const val = parseFloat(args[++i]);
      if (isNaN(val) || val < 0 || val > 1) {
        console.error('Error: tempSweepProbability must be a float between 0.0 and 1.0');
        process.exit(1);
      }
      cfg.tempSweepProbability = val;
    } else if (arg === '--tripwireMaxFileSizeKb' || arg === '-s' || arg === '--tripwire-cap') {
      const val = parseInt(args[++i], 10);
      if (isNaN(val)) {
        console.error('Error: tripwireMaxFileSizeKb must be a number');
        process.exit(1);
      }
      cfg.tripwireMaxFileSizeKb = val;
    } else if (arg === '--conductor' || arg === '-d') {
      const val = args[++i];
      cfg.conductor = val === 'true';
    } else if (arg === '--disable' || arg === '-x') {
      const val = args[++i];
      if (!val) {
        console.error('Error: disable list cannot be empty');
        process.exit(1);
      }
      cfg.disable = val.split(',').map(s => s.trim().toLowerCase());
    } else {
      console.error(`Error: Unrecognized option '${arg}'`);
      printHelp();
      process.exit(1);
    }
  }

  try {
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
    console.log(`Successfully updated configuration in: ${configPath}`);
    console.log(JSON.stringify(cfg, null, 2));
  } catch (e) {
    console.error(`Error: Failed to write to config file: ${e.message}`);
    process.exit(1);
  }
}

main();
