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

// One BOM- and comment-tolerant JSONC read. Strips // and /* */ comments outside
// strings: the string alternative consumes an escaped char (\\.) or any
// non-quote/non-backslash char, so a value ending in \\ terminates the string
// correctly instead of leaking escape state into the next token (which would
// mis-strip a later //-containing string → silent revert).
function readCfgFile(file) {
  try {
    const content = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    const cleanJson = content.replace(/"(?:\\.|[^"\\])*"|\/\/.*|\/\*[\s\S]*?\*\//g, (m) => (m[0] === '"' ? m : ''));
    const parsed = JSON.parse(cleanJson);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {}
  return null;
}

// Two-level cached read of .coalmine.json: the global ~/.claude/.coalmine.json
// overlaid per key by the project <gitroot>/.coalmine.json (project wins).
// __proto__/constructor/prototype keys are dropped at merge (an untrusted
// project config must not pollute the prototype). Cached — one disk pass per
// invocation (Phoenix #3: budget the work, not the process).
// NOTE: NO safer-value-wins guard here (unlike CoalWash) BY DESIGN — every
// hook-read key is Phoenix-13 side-effect-free (report / nudge / scan, nothing
// deleted or auto-edited), so a project override has no safety choice to weaken;
// and the one auto-EDIT key (autoFixMode) is read by the AGENT from the raw file,
// not by any hook via this merge, so a hook-side guard would protect nothing.
let _cfg;
function loadCfg() {
  if (_cfg !== undefined) return _cfg;
  _cfg = null;
  try {
    const globalCfg = readCfgFile(path.join(os.homedir(), '.claude', '.coalmine.json'));
    const projectCfg = readCfgFile(path.join(findGitRoot(process.cwd()), '.coalmine.json'));
    if (globalCfg || projectCfg) {
      const merged = {};
      for (const src of [globalCfg, projectCfg]) {
        if (!src) continue;
        for (const key of Object.keys(src)) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
          merged[key] = src[key];
        }
      }
      _cfg = merged;
    }
  } catch {}
  return _cfg;
}
