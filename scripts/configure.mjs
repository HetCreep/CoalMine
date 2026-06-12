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
  --language, -l <lang>               Set language override (auto, th, en, ja, zh, es)
  --autoScanFileCap, -c <num>         Set automatic file cap (default: 10)
  --tempSweepProbability, -p <num>    Set temp file sweep probability (0.0 to 1.0, default: 0.05)
  --tripwireMaxFileSizeKb, -s <num>   Set maximum file size in KB for tripwire scan (default: 100)
  --enableConductor, -d <true|false>  Enable or disable conductor rules injection
  --disabledCanaries, -x <skills...>  Comma-separated list of skills to disable (or "all")
  --rotCanaryMode, -m <mode>          Set rot-canary mode (auto, manual, off)
  --defaultTier, -t <tier>            Set default evaluation tier (Light, Standard, Heavy, auto)
  --branchPrefix, -b <prefix>         Set git branch prefix for PRs (default: feature/)
  --pullRequestRemote, -r <remote>    Set git remote name for PRs (default: origin)
  --autoFixMode, -f <mode>            Set default fix mode behavior (interactive, safe, off)
  --skipOnboarding, -o <true|false>   Skip onboarding rules offer at session start
  --ruleRevalidateDays, -v <days>     Days before reference files are flagged as stale
  --help, -h                          Show this help message

Examples:
  node scripts/configure.mjs --language th --file-cap 15
  node scripts/configure.mjs --disabledCanaries rot-canary,drift-canary
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
      const cleanJson = content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
      cfg = JSON.parse(cleanJson) || {};
      // Migrate old keys to new keys if present
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
    } catch (e) {
      console.warn('Warning: existing .coalmine.json is malformed. Overwriting.');
    }
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--language' || arg === '-l') {
      const val = args[++i];
      if (!['auto', 'th', 'en', 'ja', 'zh', 'es'].includes(val?.toLowerCase())) {
        console.error('Error: Language must be one of: auto, th, en, ja, zh, es');
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
    } else if (arg === '--enableConductor' || arg === '--conductor' || arg === '-d') {
      const val = args[++i];
      cfg.enableConductor = val === 'true';
    } else if (arg === '--disabledCanaries' || arg === '--disable' || arg === '-x') {
      const val = args[++i];
      if (!val) {
        console.error('Error: disabledCanaries list cannot be empty');
        process.exit(1);
      }
      cfg.disabledCanaries = val.split(',').map(s => s.trim().toLowerCase());
    } else if (arg === '--rotCanaryMode' || arg === '--mode' || arg === '-m') {
      const val = args[++i];
      if (!['auto', 'manual', 'off'].includes(val?.toLowerCase())) {
        console.error('Error: rotCanaryMode must be one of: auto, manual, off');
        process.exit(1);
      }
      cfg.rotCanaryMode = val.toLowerCase();
    } else if (arg === '--defaultTier' || arg === '-t') {
      const val = args[++i];
      if (!['light', 'standard', 'heavy', 'auto'].includes(val?.toLowerCase())) {
        console.error('Error: defaultTier must be one of: Light, Standard, Heavy, auto');
        process.exit(1);
      }
      // Normalize tier to title case or auto
      const cleanVal = val.toLowerCase();
      cfg.defaultTier = cleanVal === 'auto' ? 'auto' : (cleanVal.charAt(0).toUpperCase() + cleanVal.slice(1));
    } else if (arg === '--branchPrefix' || arg === '-b') {
      cfg.branchPrefix = args[++i];
    } else if (arg === '--pullRequestRemote' || arg === '-r') {
      cfg.pullRequestRemote = args[++i];
    } else if (arg === '--autoFixMode' || arg === '-f') {
      const val = args[++i];
      if (!['interactive', 'safe', 'off'].includes(val?.toLowerCase())) {
        console.error('Error: autoFixMode must be one of: interactive, safe, off');
        process.exit(1);
      }
      cfg.autoFixMode = val.toLowerCase();
    } else if (arg === '--skipOnboarding' || arg === '-o') {
      cfg.skipOnboarding = args[++i] === 'true';
    } else if (arg === '--ruleRevalidateDays' || arg === '--antivirusStalenessDays' || arg === '-v') {
      const val = parseInt(args[++i], 10);
      if (isNaN(val)) {
        console.error('Error: ruleRevalidateDays must be a number');
        process.exit(1);
      }
      cfg.ruleRevalidateDays = val;
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
