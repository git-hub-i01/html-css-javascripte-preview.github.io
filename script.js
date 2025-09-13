// Helpers
const $ = s => document.querySelector(s);
const htmlEl = $('#htmlEditor');
const cssEl = $('#cssEditor');
const jsEl = $('#jsEditor');
const frame = $('#frame');
const logEl = $('#log');
const runBtn = $('#runBtn');
const saveBtn = $('#saveBtn');
const loadBtn = $('#loadBtn');
const resetBtn = $('#resetBtn');
const downloadBtn = $('#downloadBtn');
const shareBtn = $('#shareBtn');
const autoRunEl = $('#autoRun');
const darkBtn = $('#darkBtn');

const DEFAULT = {
  html:
`<main class="wrap">
  <h1>Online Code Editor</h1>
  <p>Edit HTML, CSS, JS on the left, then click <strong>Run</strong> or enable <em>Auto-Run</em>.</p>
  <button id="demoBtn">Click me</button>
  <p id="out"></p>
</main>`,
  css:
`:root{
  --c:#111827; --bg:#f8fafc; --p:#2563eb; --card:#ffffff; --muted:#6b7280;
}
*{box-sizing:border-box}
body{margin:0; font:16px/1.5 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:var(--c); background:var(--bg)}
.wrap{max-width:720px; margin:6vh auto; padding:24px; background:var(--card); border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 10px 30px rgba(2,6,23,.06)}
h1{margin:0 0 10px; font-size:28px}
p{margin:0 0 12px; color:var(--muted)}
button{background:var(--p); color:#fff; border:0; padding:10px 14px; border-radius:10px; cursor:pointer}
button:hover{filter:brightness(1.05)}`,
  js:
`console.info("Editor ready.");
const btn = document.getElementById("demoBtn");
const out = document.getElementById("out");
btn?.addEventListener("click", () => {
  out.textContent = "Clicked at " + new Date().toLocaleTimeString();
  console.log({clicked:true, at: Date.now()});
});
`
};

function buildSrcdoc(html, css, js){
  // Console bridge inside iframe -> parent
  const bridge = `
<script>
(function(){
  function send(kind, payload){
    try{ parent.postMessage({type:kind, payload}, "*"); }catch(e){}
  }
  ["log","info","warn","error"].forEach(function(level){
    const orig = console[level].bind(console);
    console[level] = function(){
      try{
        const args = Array.from(arguments).map(a => {
          try{
            if (typeof a === "string") return a;
            return JSON.stringify(a, null, 2);
          }catch(e){ return String(a); }
        });
        send("console", { level, msg: args.join(" ") });
      }catch(e){}
      orig.apply(console, arguments);
    }
  });
  window.addEventListener("error", function(e){
    send("console", { level:"error", msg: (e.message||"Error")+" ("+(e.filename||"") + ":" + (e.lineno||0) + ":" + (e.colno||0) + ")" });
  });
  window.addEventListener("unhandledrejection", function(e){
    send("console", { level:"error", msg: "Unhandled promise rejection: " + (e.reason && (e.reason.stack||e.reason.message||e.reason)) });
  });
})();
<\/script>`;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>${css||""}</style>
</head>
<body>
${html||""}
${bridge}
<script>
try{
${js||""}
}catch(e){
  console.error(e && (e.stack || e.message) || e);
}
<\/script>
</body>
</html>`;
}

function run(){
  const html = htmlEl.value;
  const css = cssEl.value;
  const js = jsEl.value;
  const doc = buildSrcdoc(html, css, js);
  frame.srcdoc = doc;
  appendLog("ok","Preview updated.");
}

function appendLog(level, msg){
  const div = document.createElement('div');
  div.className = `line ${level}`;
  div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function clearLog(){
  logEl.innerHTML = "";
  appendLog("info", "Console cleared.");
}

window.addEventListener("message", (e)=>{
  const data = e.data || {};
  if(data.type === "console"){
    const { level, msg } = data.payload || {};
    appendLog(level||"info", String(msg||""));
  }
});

function save(key="oce-project"){
  const data = {
    html: htmlEl.value,
    css: cssEl.value,
    js: jsEl.value,
    dark: document.body.dataset.theme === "dark",
    auto: autoRunEl.checked,
    t: Date.now()
  };
  localStorage.setItem(key, JSON.stringify(data));
  appendLog("ok","Saved to localStorage.");
}

function load(key="oce-project"){
  const raw = localStorage.getItem(key);
  if(!raw){ appendLog("warn","No saved project found."); return; }
  try{
    const data = JSON.parse(raw);
    htmlEl.value = data.html ?? DEFAULT.html;
    cssEl.value = data.css ?? DEFAULT.css;
    jsEl.value = data.js ?? DEFAULT.js;
    if(typeof data.dark === "boolean") setDark(data.dark);
    if(typeof data.auto === "boolean") autoRunEl.checked = data.auto;
    appendLog("ok","Loaded from localStorage.");
    run();
  }catch(e){
    appendLog("error","Failed to load: " + e.message);
  }
}

function reset(){
  htmlEl.value = DEFAULT.html;
  cssEl.value = DEFAULT.css;
  jsEl.value = DEFAULT.js;
  appendLog("warn","Reset to boilerplate.");
  run();
}

function download(filename, content, type="text/html"){
  const blob = new Blob([content], {type});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}

function downloadCombined(){
  const combined = buildSrcdoc(htmlEl.value, cssEl.value, jsEl.value);
  download("project.html", combined, "text/html");
  appendLog("ok","Downloaded project.html");
}

function encodeShare(){
  // Encode project into URL hash using base64 of URI-encoded JSON
  const obj = {h: htmlEl.value, c: cssEl.value, j: jsEl.value};
  const json = JSON.stringify(obj);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return "#p=" + b64;
}

function decodeShare(hash){
  try{
    const b64 = hash.replace(/^#p=/,'');
    const json = decodeURIComponent(escape(atob(b64)));
    const obj = JSON.parse(json);
    return obj;
  }catch(e){ return null; }
}

async function share(){
  const url = location.origin + location.pathname + encodeShare();
  try{
    await navigator.clipboard.writeText(url);
    appendLog("ok","Share link copied to clipboard.");
  }catch{
    appendLog("warn","Copy failed. Link placed in console.");
    appendLog("info", url);
  }
}

function setDark(on){
  document.body.dataset.theme = on ? "dark" : "";
  if(on){
    // Already themed via CSS variables; toggle just for state
  }
  localStorage.setItem("oce-dark", on ? "1" : "0");
}

// Debounce for Auto-Run
function debounce(fn, ms){
  let t; return function(...args){
    clearTimeout(t); t = setTimeout(()=>fn.apply(this,args), ms);
  }
}
const autoRun = debounce(()=>{
  if(autoRunEl.checked) run();
}, 400);

// Events
runBtn.addEventListener("click", run);
saveBtn.addEventListener("click", ()=>save());
loadBtn.addEventListener("click", ()=>load());
resetBtn.addEventListener("click", reset);
downloadBtn.addEventListener("click", downloadCombined);
shareBtn.addEventListener("click", share);
darkBtn.addEventListener("click", ()=>setDark(!(document.body.dataset.theme==="dark")));
autoRunEl.addEventListener("change", ()=>{ if(autoRunEl.checked) run(); });

[htmlEl, cssEl, jsEl].forEach(el=>{
  el.addEventListener("input", autoRun);
});

// Keyboard shortcuts
window.addEventListener("keydown", (e)=>{
  if(e.ctrlKey && e.key.toLowerCase()==="enter"){ e.preventDefault(); run(); }
  if(e.ctrlKey && e.key.toLowerCase()==="s"){ e.preventDefault(); save(); }
  if(e.ctrlKey && e.key.toLowerCase()==="l"){ e.preventDefault(); clearLog(); }
  if(e.altKey && (e.key.toLowerCase()==="r")){ e.preventDefault(); autoRunEl.checked = !autoRunEl.checked; if(autoRunEl.checked) run(); }
});

$('#clearConsoleBtn').addEventListener('click', clearLog);

// Mobile tabs
const tabs = $('#tabs');
const panel = $('#editorPanel');
function applyResponsiveTabs(){
  const isNarrow = window.matchMedia("(max-width: 980px)").matches;
  tabs.style.display = isNarrow ? "flex" : "none";
  panel.classList.toggle("stack", isNarrow);
  if(isNarrow){
    // ensure one active
    setActivePane(document.querySelector('.tab.active')?.dataset.target || 'html');
  }else{
    // show all panes
    document.querySelectorAll('.pane').forEach(p=>p.classList.add('active'));
  }
}
function setActivePane(name){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.target===name));
  document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('active', p.dataset.name===name));
}
tabs.addEventListener("click", (e)=>{
  const btn = e.target.closest('.tab');
  if(!btn) return;
  setActivePane(btn.dataset.target);
});
window.addEventListener("resize", applyResponsiveTabs);

// Init
(function init(){
  // Load theme and auto
  setDark(localStorage.getItem("oce-dark")==="1");
  autoRunEl.checked = localStorage.getItem("oce-auto")==="1";
  autoRunEl.addEventListener("change", ()=>localStorage.setItem("oce-auto", autoRunEl.checked ? "1" : "0"));

  // Try URL share
  const hash = location.hash || "";
  let loaded = false;
  if(/^#p=/.test(hash)){
    const data = decodeShare(hash);
    if(data){
      htmlEl.value = data.h ?? DEFAULT.html;
      cssEl.value = data.c ?? DEFAULT.css;
      jsEl.value = data.j ?? DEFAULT.js;
      loaded = true;
      appendLog("ok","Loaded from shared link.");
    }
  }
  if(!loaded){
    // Try saved, else defaults
    const raw = localStorage.getItem("oce-project");
    if(raw){
      try{
        const d = JSON.parse(raw);
        htmlEl.value = d.html ?? DEFAULT.html;
        cssEl.value = d.css ?? DEFAULT.css;
        jsEl.value = d.js ?? DEFAULT.js;
        appendLog("ok","Loaded last project.");
        loaded = true;
      }catch{}
    }
  }
  if(!loaded){
    reset();
  }else{
    run();
  }
  applyResponsiveTabs();
})();
