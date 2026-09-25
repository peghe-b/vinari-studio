// Which video the Claude step wrote for this request (the studio workflow's voice step, and publish.mjs).
//   STUDIO_REQ=r-abc123-x1y2 node tools/ci/resolve.mjs      prints the video id, nothing else on stdout
//
// The ledger is specs/.studio.json, {"<req>": {"id", "topic", "base", "at"}}, written by the Claude step
// (env STUDIO_LEDGER points at another file: a rehearsal, tools/ci/rehearse.sh). When the Claude step
// wrote a spec but no ledger line, and exactly one base spec is new or changed in the working tree
// (git status), that spec is taken and the line is added here, with a warning. Anything else stops the
// run with a message that says what is missing.
//
// The id must be this request's, checked against out/ci/request.json (the brief step writes it; the Claude
// step cannot): a redo's own id (request.id), or for a new video an id that starts with the next free number
// (request.next) and is not a spec already on the branch. So a Claude step talked into editing an older
// video's spec (or into a ledger line that points at one) can never get it voiced, rendered and committed.
// In GitHub Actions the file must be there and name this request; on the Mac (tools/ci/rehearse.sh voices an
// existing spec) a missing or other request's file only skips the check, with a warning.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const REQ = /^r-[0-9a-z]{6,12}-[0-9a-z]{4,8}$/;
export const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
export const ledgerPath = () => path.resolve(root, process.env.STUDIO_LEDGER || 'specs/.studio.json');

const fail = (msg) => {
  console.error(`::error::${msg}`);
  process.exit(1);
};
const warn = (msg) => console.error(`::warning::${msg}`);

export const readLedger = (file = ledgerPath()) => {
  if (!fs.existsSync(file)) return {};
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    return j && typeof j === 'object' && !Array.isArray(j) ? j : {};
  } catch (e) {
    fail(`${path.relative(root, file)} is not valid JSON: ${e.message}`);
  }
};

// one request per line: short diffs, and the file stays readable
export const writeLedger = (ledger, file = ledgerPath()) => {
  const keys = Object.keys(ledger);
  const body = keys.length ? `{\n${keys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(ledger[k])}`).join(',\n')}\n}\n` : '{}\n';
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, body);
  fs.renameSync(tmp, file);
};

// a base spec file: specs/<id>.json, not a dotfile, a demo, a hook variant (--hN) or a translation (.en)
const baseSpecId = (rel) => {
  const m = /(?:^|\/)specs\/([a-z0-9][a-z0-9-]*)\.json$/.exec(rel); // porcelain paths start at the git root
  return m && !m[1].startsWith('demo-') && !/--h\d+$/.test(m[1]) ? m[1] : null;
};

const inActions = process.env.GITHUB_ACTIONS === 'true';
const requestFile = path.join(root, 'out/ci/request.json');

// out/ci/request.json of this request, or null (then the id is not checked; only off GitHub Actions)
const requestOf = (req) => {
  let request = null;
  try {
    request = JSON.parse(fs.readFileSync(requestFile, 'utf8'));
  } catch {}
  if (request && request.req === req) return request;
  const why = request ? `names ${JSON.stringify(String(request.req ?? '')).slice(0, 40)}, not ${req}` : 'is missing or not valid JSON';
  if (inActions) fail(`out/ci/request.json ${why}: the brief step writes it before the Claude step`);
  warn(`out/ci/request.json ${why}: the video's id is not checked against the request (a rehearsal)`);
  return null;
};

// a spec already committed on the branch (HEAD), i.e. an earlier video's
const onBranch = (id) => {
  try {
    execFileSync('git', ['cat-file', '-e', `HEAD:./specs/${id}.json`], {cwd: root, stdio: 'ignore'});
    return true;
  } catch {
    return false;
  }
};

// why this id cannot be this request's video, or '' when it can
const notThisRequest = (id, request) => {
  if (!request) return '';
  if (request.base) return id === request.id ? '' : `this request is a redo whose video is ${request.id}, not ${id}`;
  if (!String(request.next || '') || !id.startsWith(String(request.next))) return `a new video's id starts with "${request.next}", not "${id}"`;
  if (onBranch(id)) return `specs/${id}.json is an earlier video's spec (already on the branch), not a new one`;
  return '';
};

const changedSpecs = () => {
  try {
    const out = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '--', 'specs'], {cwd: root, encoding: 'utf8'});
    return [...new Set(out.split('\n').map((l) => baseSpecId(l.slice(3).trim())).filter(Boolean))];
  } catch {
    return [];
  }
};

export const resolve = ({req = process.env.STUDIO_REQ, write = true} = {}) => {
  if (!REQ.test(req ?? '')) fail(`STUDIO_REQ "${req ?? ''}" is not a request id (r-xxxxxx-xxxx)`);
  const file = ledgerPath();
  const ledger = readLedger(file);
  const request = requestOf(req);
  let entry = ledger[req];
  if (!entry || typeof entry !== 'object') {
    // only a spec this request may have written counts
    const changed = changedSpecs().filter((id) => !notThisRequest(id, request));
    if (changed.length !== 1) {
      fail(
        changed.length
          ? `the Claude step wrote no line for ${req} in ${path.relative(root, file)}, and ${changed.length} specs changed (${changed.join(', ')}): cannot tell which one is this video`
          : `the Claude step wrote no spec for ${req}: no line in ${path.relative(root, file)} and no new spec in specs/ (see the "script" step's log)`,
      );
    }
    entry = {id: changed[0], topic: process.env.STUDIO_TOPIC ?? '', base: process.env.STUDIO_BASE || null, at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')};
    warn(`no line for ${req} in ${path.relative(root, file)}; taking the one spec the Claude step changed: specs/${changed[0]}.json`);
    if (write) writeLedger({...ledger, [req]: entry}, file);
  }
  const id = entry.id;
  if (typeof id !== 'string' || !ID.test(id)) fail(`${path.relative(root, file)}: ${req} has no valid "id" (got ${JSON.stringify(id)})`);
  const wrong = notThisRequest(id, request);
  if (wrong) fail(`${path.relative(root, file)} says ${req} is ${id}, but ${wrong}`);
  const spec = path.join(root, 'specs', `${id}.json`);
  if (!fs.existsSync(spec)) fail(`${path.relative(root, file)} says ${req} is ${id}, but specs/${id}.json does not exist`);
  let json;
  try {
    json = JSON.parse(fs.readFileSync(spec, 'utf8'));
  } catch (e) {
    fail(`specs/${id}.json is not valid JSON: ${e.message}`);
  }
  if (json.id !== id) fail(`specs/${id}.json has "id": ${JSON.stringify(json.id)}; it must be "${id}"`);
  return {id, entry, spec: json, specFile: spec};
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${resolve().id}\n`);
}
