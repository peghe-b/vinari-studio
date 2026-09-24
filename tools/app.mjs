// One-click video maker: a local page with one text box. Type the idea, press "შექმენი",
// and Claude Code (the owner's own subscription, headless `claude -p`) writes the script,
// voices it, renders it and reviews it with the /video skill. Nothing leaves this Mac
// except Claude Code's own traffic and the free Edge voice requests.
//
//   node tools/app.mjs          -> http://127.0.0.1:4777
//
// Only one job runs at a time (the M1 has 8 GB and renders are heavy).
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const studio = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repo = path.dirname(studio);
const PORT = Number(process.env.PORT ?? 4777);
const NODE_BIN = path.join(os.homedir(), '.local/node/bin'); // the Mac's node and claude
const CLAUDE = process.env.CLAUDE_BIN ?? path.join(NODE_BIN, 'claude');

let job = null; // {id, idea, started, lines[], done, result, proc}
const clients = new Set();
const send = (type, data) => {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) c.write(msg);
};
const log = (text) => {
  if (!job) return;
  job.lines.push(text);
  send('log', text);
};

const videos = () =>
  fs.existsSync(path.join(studio, 'out'))
    ? fs
        .readdirSync(path.join(studio, 'out'))
        .filter((f) => /^[a-z0-9-]+\.mp4$/.test(f))
        .map((f) => ({
          f,
          t: fs.statSync(path.join(studio, 'out', f)).mtimeMs,
          size: fs.statSync(path.join(studio, 'out', f)).size,
          cover: fs.existsSync(path.join(studio, 'out', f.replace('.mp4', '.cover.png'))) ? f.replace('.mp4', '.cover.png') : null,
        }))
        .sort((a, b) => b.t - a.t)
    : [];

const promptFor = ({idea, length, voice, lang}) =>
  [
    `ვიდეო გამიკეთე: ${idea}`,
    `სიგრძე: ${length} წამი (მაქსიმუმი, არ გადააჭარბო).`,
    voice === 'auto' ? 'ხმა: შენ აირჩიე (გიორგი ან ეკა).' : `ხმა: ${voice === 'eka' ? 'ეკა (ka-GE-EkaNeural)' : 'გიორგი (ka-GE-GiorgiNeural)'}.`,
    lang === 'ka' ? 'ენა: ქართული.' : `ენა: ${lang === 'en' ? 'ინგლისური' : 'რუსული'} (ქართული ვერსიაც გააკეთე).`,
    'გამოიყენე video სკილი (.claude/skills/video/SKILL.md), video-studio/CLAUDE.md და video-studio/HOOKS.md.',
    'ვირუსული ჰუკი: დაწერე 5, შეაფასე HOOKS.md-ის რუბრიკით და აიღე საუკეთესო.',
    'კადრები თავად შეამოწმე stills-ით და გაასწორე, სანამ საბოლოო რენდერს გააკეთებ.',
    'მომხმარებელი ეკრანთან არაა: არაფერი იკითხო, თავად გადაწყვიტე.',
    'ბოლოს დაბეჭდე ზუსტად ერთი ხაზი: RESULT: video-studio/out/<id>.mp4',
  ].join('\n');

const start = (opts) => {
  const id = Date.now().toString(36);
  job = {id, idea: opts.idea, started: Date.now(), lines: [], done: false, result: null};
  send('job', {id, idea: opts.idea});
  const args = [
    '-p',
    promptFor(opts),
    '--output-format',
    'stream-json',
    '--verbose',
    '--permission-mode',
    'acceptEdits',
    '--allowedTools',
    'Bash',
    'Read',
    'Write',
    'Edit',
    'Glob',
    'Grep',
    'Skill',
  ];
  const proc = spawn(CLAUDE, args, {cwd: repo, stdio: ['ignore', 'pipe', 'pipe'], env: {...process.env, PATH: `${NODE_BIN}:${process.env.PATH}`}});
  job.proc = proc;
  let buf = '';
  proc.stdout.on('data', (d) => {
    buf += d.toString();
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        const ev = JSON.parse(line);
        if (ev.type === 'assistant') {
          for (const c of ev.message?.content ?? []) {
            if (c.type === 'text' && c.text.trim()) log(c.text.trim());
            if (c.type === 'tool_use') log(`▸ ${c.name}${c.input?.description ? `: ${c.input.description}` : c.input?.file_path ? `: ${path.basename(c.input.file_path)}` : ''}`);
          }
        } else if (ev.type === 'result') {
          const text = String(ev.result ?? '');
          if (/not logged in|\/login/i.test(text)) loginHelp();
          const m = text.match(/RESULT:\s*(\S+\.mp4)/);
          job.result = m ? m[1] : null;
          if (text.trim()) log(text.trim());
        }
      } catch {
        log(line);
      }
    }
  });
  const loginHelp = () =>
    log('⚠ Claude Code ამ კომპიუტერზე ჯერ შესული არაა. ერთხელ: გახსენი Terminal, ჩაწერე  claude  და შიგნით  /login . მერე აქ თავიდან დააჭირე „შექმენი". (ან უბრალოდ ჩატში დაწერე: „ვიდეო გამიკეთე ...")');
  proc.stderr.on('data', (d) => {
    const t = d.toString().trim();
    if (/not logged in|\/login/i.test(t)) loginHelp();
    else log(t);
  });
  proc.on('close', (code) => {
    job.done = true;
    const file = job.result ? path.basename(job.result) : videos()[0]?.f;
    send('done', {code, file});
  });
};

const page = () => `<!doctype html><html lang="ka"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vinari Video</title><style>
@font-face{font-family:FiraGO;src:url(/fonts/FiraGO-Regular.otf);font-weight:400}
@font-face{font-family:FiraGO;src:url(/fonts/FiraGO-Medium.otf);font-weight:500}
@font-face{font-family:FiraGO;src:url(/fonts/FiraGO-SemiBold.otf);font-weight:600}
:root{--bg:#0B0B0E;--ink:#EDEDF2;--ink2:#8A8A8E;--rule:#2A2A30;--up:#00E24B}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 50% 0,#141418,#050506 70%) fixed;color:var(--ink);font:500 16px/1.45 FiraGO,system-ui}
main{max-width:980px;margin:0 auto;padding:40px 20px 80px}
h1{font-weight:600;font-size:34px;margin:0 0 4px}p.sub{color:var(--ink2);margin:0 0 28px}
textarea{width:100%;min-height:110px;background:#111114;border:1px solid var(--rule);border-radius:16px;color:var(--ink);font:500 20px FiraGO;padding:18px;resize:vertical}
textarea:focus{outline:none;border-color:#55555c}
.row{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 22px}
.seg{display:flex;background:#111114;border:1px solid var(--rule);border-radius:12px;padding:3px}
.seg input{display:none}.seg label{padding:8px 14px;border-radius:9px;color:var(--ink2);cursor:pointer}
.seg input:checked+label{background:var(--ink);color:#0B0B0E}
button{margin-left:auto;background:var(--ink);color:#0B0B0E;border:0;border-radius:12px;padding:12px 26px;font:600 17px FiraGO;cursor:pointer}
button:disabled{opacity:.4;cursor:default}
#log{background:#08080a;border:1px solid var(--rule);border-radius:14px;padding:14px 16px;font:13px/1.55 ui-monospace,Menlo,monospace;color:var(--ink2);height:220px;overflow:auto;white-space:pre-wrap;display:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px;margin-top:28px}
.card{background:#101013;border:1px solid var(--rule);border-radius:16px;overflow:hidden}
.card video{width:100%;aspect-ratio:9/16;display:block;background:#000}
.card div{padding:10px 12px;font-size:13px;color:var(--ink2);display:flex;justify-content:space-between}
.card a{color:var(--ink)}.new{outline:2px solid var(--up)}
.hint{color:var(--ink2);font-size:14px;margin-top:8px}
</style></head><body><main>
<h1>Vinari · ვიდეო</h1><p class="sub">დაწერე რაზე იყოს. დანარჩენს თავად გააკეთებს: ჰუკი, სცენარი, ხმა, სუბტიტრი, გრაფიკა, ხმოვანი ეფექტები.</p>
<textarea id="idea" placeholder="მაგ: QR ბარათი შუშაზე, ნომერი რომ არ დატოვო"></textarea>
<div class="row">
<div class="seg"><input type="radio" name="len" id="l15" value="15"><label for="l15">15 წმ</label><input type="radio" name="len" id="l20" value="20" checked><label for="l20">20 წმ</label><input type="radio" name="len" id="l30" value="30"><label for="l30">30 წმ</label></div>
<div class="seg"><input type="radio" name="voice" id="va" value="auto" checked><label for="va">ხმა: ავტო</label><input type="radio" name="voice" id="vg" value="giorgi"><label for="vg">გიორგი</label><input type="radio" name="voice" id="ve" value="eka"><label for="ve">ეკა</label></div>
<div class="seg"><input type="radio" name="lang" id="ka" value="ka" checked><label for="ka">ქართ</label><input type="radio" name="lang" id="en" value="en"><label for="en">ENG</label><input type="radio" name="lang" id="ru" value="ru"><label for="ru">РУС</label></div>
<button id="go">შექმენი</button></div>
<div id="log"></div><div class="hint" id="hint"></div>
<div class="grid" id="grid"></div>
</main><script>
const $=s=>document.querySelector(s);const val=n=>document.querySelector('input[name='+n+']:checked').value;
const logEl=$('#log');
function add(t){logEl.style.display='block';logEl.textContent+=t+'\\n';logEl.scrollTop=1e9}
async function refresh(mark){const v=await (await fetch('/api/videos')).json();$('#grid').innerHTML=v.map(x=>'<div class="card'+(x.f===mark?' new':'')+'"><video src="/out/'+x.f+'"'+(x.cover?' poster="/out/'+x.cover+'"':'')+' controls preload="metadata" playsinline></video><div><a href="/out/'+x.f+'" download>'+x.f.replace('.mp4','')+'</a><span>'+(x.size/1e6).toFixed(1)+' MB</span></div></div>').join('')}
const es=new EventSource('/events');
es.addEventListener('log',e=>add(JSON.parse(e.data)));
es.addEventListener('job',e=>{$('#go').disabled=true;$('#hint').textContent='მუშაობს. ჩვეულებრივ 10-25 წუთი სჭირდება: სცენარი, ხმა, კადრების შემოწმება, რენდერი.'});
es.addEventListener('done',e=>{const d=JSON.parse(e.data);$('#go').disabled=false;$('#hint').textContent=d.file?'მზადაა: '+d.file:'დასრულდა, შედეგი ლოგშია.';refresh(d.file);try{new Audio('/done.m4a').play()}catch(_){}} );
$('#go').onclick=async()=>{const idea=$('#idea').value.trim();if(!idea)return $('#idea').focus();logEl.textContent='';
const r=await fetch('/api/make',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idea,length:val('len'),voice:val('voice'),lang:val('lang')})});
if(!r.ok)add(await r.text())};
fetch('/api/state').then(r=>r.json()).then(s=>{if(s.running){$('#go').disabled=true;s.lines.forEach(add)}});
refresh();
</script></body></html>`;

const types = {'.mp4': 'video/mp4', '.otf': 'font/otf', '.m4a': 'audio/mp4', '.png': 'image/png'};
const serveFile = (res, file, req) => {
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  const {size} = fs.statSync(file);
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  const type = types[path.extname(file)] ?? 'application/octet-stream';
  if (range) {
    const a = range[1] ? Number(range[1]) : 0;
    const z = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, {'content-type': type, 'content-range': `bytes ${a}-${z}/${size}`, 'accept-ranges': 'bytes', 'content-length': z - a + 1});
    return fs.createReadStream(file, {start: a, end: z}).pipe(res);
  }
  res.writeHead(200, {'content-type': type, 'content-length': size, 'accept-ranges': 'bytes'});
  fs.createReadStream(file).pipe(res);
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/') return res.writeHead(200, {'content-type': 'text/html; charset=utf-8'}).end(page());
    if (url.pathname === '/events') {
      res.writeHead(200, {'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive'});
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (url.pathname === '/api/videos') return res.writeHead(200, {'content-type': 'application/json'}).end(JSON.stringify(videos()));
    if (url.pathname === '/api/state') return res.writeHead(200, {'content-type': 'application/json'}).end(JSON.stringify({running: !!job && !job.done, lines: job?.lines ?? []}));
    if (url.pathname === '/api/make' && req.method === 'POST') {
      if (job && !job.done) return res.writeHead(409).end('ერთი ვიდეო უკვე კეთდება. დაელოდე, სანამ დასრულდება.');
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', () => {
        try {
          const o = JSON.parse(body);
          const idea = String(o.idea ?? '').slice(0, 800).trim();
          if (!idea) return res.writeHead(400).end('იდეა ცარიელია');
          start({idea, length: ['15', '20', '30'].includes(o.length) ? o.length : '20', voice: ['auto', 'giorgi', 'eka'].includes(o.voice) ? o.voice : 'auto', lang: ['ka', 'en', 'ru'].includes(o.lang) ? o.lang : 'ka'});
          res.writeHead(202).end('ok');
        } catch (e) {
          res.writeHead(400).end(String(e));
        }
      });
      return;
    }
    if (url.pathname.startsWith('/out/')) return serveFile(res, path.join(studio, 'out', path.basename(url.pathname)), req);
    if (url.pathname.startsWith('/fonts/')) return serveFile(res, path.join(studio, 'public', 'fonts', path.basename(url.pathname)), req);
    if (url.pathname === '/done.m4a') return serveFile(res, path.join(studio, 'public', 'sfx', 'app-saved.m4a'), req);
    res.writeHead(404).end();
  })
  .listen(PORT, '127.0.0.1', () => console.log(`Vinari Video: http://127.0.0.1:${PORT}`));
