from http.server import BaseHTTPRequestHandler
import os, json, urllib.parse


def env(name: str) -> str:
    """Lit une variable d'env en retirant le BOM UTF-8 que Python ne strip() pas."""
    return os.environ.get(name, "").strip().lstrip("﻿").strip()


REDIRECT_URI = env("TIKTOK_REDIRECT_URI")
CLIENT_KEY   = env("TIKTOK_CLIENT_KEY")

HTML = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>EMO Robot FR — Dashboard</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0a0a0f;--card:#13131a;--border:#1e1e2e;--accent:#7c3aed;--accent2:#a855f7;--text:#e2e2f0;--muted:#6b6b8a;--green:#22c55e;--red:#ef4444;--yellow:#eab308}
body{background:var(--bg);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh}

/* NAV */
nav{display:flex;align-items:center;justify-content:space-between;padding:16px 32px;border-bottom:1px solid var(--border);backdrop-filter:blur(10px);position:sticky;top:0;z-index:100;background:rgba(10,10,15,.8)}
.logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:1.1rem}
.logo-icon{width:36px;height:36px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem}
.nav-right{display:flex;align-items:center;gap:12px}
.badge{background:var(--card);border:1px solid var(--border);padding:4px 12px;border-radius:20px;font-size:.8rem;color:var(--muted)}
.badge.live{border-color:var(--green);color:var(--green)}
.btn{padding:8px 18px;border-radius:8px;border:none;cursor:pointer;font-size:.9rem;font-weight:600;transition:.2s}
.btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff}
.btn-primary:hover{opacity:.9;transform:translateY(-1px)}
.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}
.btn-ghost:hover{color:var(--text);border-color:var(--accent)}
.btn-sm{padding:5px 12px;font-size:.8rem}

/* LOGIN SCREEN */
#login-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:90vh;gap:24px;padding:20px}
.login-card{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:48px;max-width:420px;width:100%;text-align:center}
.login-card h1{font-size:1.8rem;margin-bottom:8px;background:linear-gradient(135deg,var(--accent2),#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.login-card p{color:var(--muted);margin-bottom:32px;line-height:1.6}
.tiktok-btn{display:flex;align-items:center;justify-content:center;gap:12px;background:#fff;color:#000;border:none;border-radius:12px;padding:14px 28px;font-size:1rem;font-weight:700;cursor:pointer;width:100%;transition:.2s}
.tiktok-btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(255,255,255,.15)}
.tiktok-btn svg{width:24px;height:24px}

/* MAIN LAYOUT */
#app{display:none;padding:24px 32px;max-width:1200px;margin:0 auto}

/* STATS ROW */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px}
.stat-card .label{color:var(--muted);font-size:.8rem;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em}
.stat-card .value{font-size:1.8rem;font-weight:700}
.stat-card .sub{color:var(--muted);font-size:.8rem;margin-top:4px}
.trend-up{color:var(--green)}
.trend-down{color:var(--red)}

/* GRID */
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px}
.card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.card-title{font-weight:600;font-size:.95rem}

/* PLANNING */
.plan-form{display:flex;flex-direction:column;gap:12px}
.plan-form label{color:var(--muted);font-size:.8rem;margin-bottom:4px;display:block}
.plan-form input,.plan-form textarea,.plan-form select{background:#0d0d15;border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px 14px;font-size:.9rem;width:100%;outline:none;transition:.2s;font-family:inherit}
.plan-form input:focus,.plan-form textarea:focus{border-color:var(--accent)}
.plan-form textarea{resize:vertical;min-height:80px}
.row{display:flex;gap:10px}
.row>*{flex:1}

/* POST LIST */
.post-item{display:flex;align-items:center;gap:14px;padding:12px;border-radius:10px;border:1px solid var(--border);margin-bottom:8px;transition:.2s}
.post-item:hover{border-color:var(--accent);background:rgba(124,58,237,.05)}
.post-thumb{width:44px;height:44px;border-radius:8px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0}
.post-info{flex:1;min-width:0}
.post-title{font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.post-meta{color:var(--muted);font-size:.75rem;margin-top:2px}
.status{display:inline-block;padding:2px 8px;border-radius:10px;font-size:.7rem;font-weight:600}
.status.published{background:rgba(34,197,94,.15);color:var(--green)}
.status.scheduled{background:rgba(234,179,8,.15);color:var(--yellow)}
.status.draft{background:rgba(107,107,138,.15);color:var(--muted)}

/* CALENDAR */
.calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.cal-head{text-align:center;font-size:.7rem;color:var(--muted);padding:4px;text-transform:uppercase}
.cal-day{aspect-ratio:1;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:.8rem;cursor:pointer;border:1px solid transparent;transition:.2s;position:relative}
.cal-day:hover{border-color:var(--accent);background:rgba(124,58,237,.1)}
.cal-day.today{border-color:var(--accent);color:var(--accent2);font-weight:700}
.cal-day.has-post::after{content:'';width:5px;height:5px;background:var(--accent2);border-radius:50%;position:absolute;bottom:3px}
.cal-day.other-month{color:var(--muted);opacity:.4}

/* TOAST */
.toast{position:fixed;bottom:24px;right:24px;background:var(--card);border:1px solid var(--green);color:var(--green);padding:12px 20px;border-radius:10px;font-size:.9rem;transform:translateY(100px);opacity:0;transition:.3s;z-index:999}
.toast.show{transform:translateY(0);opacity:1}

/* USER */
.avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:700}
</style>
</head>
<body>

<!-- LOGIN -->
<div id="login-screen">
  <div class="login-card">
    <div style="font-size:3rem;margin-bottom:16px">🤖</div>
    <h1>EMO Robot FR</h1>
    <p>Connecte ton compte TikTok pour gérer et planifier tes publications automatiques.</p>
    <button class="tiktok-btn" onclick="loginTikTok()">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.84 4.84 0 01-1.01-.07z"/></svg>
      Connexion avec TikTok
    </button>
  </div>
</div>

<!-- APP -->
<div id="app" style="display:none">
  <nav>
    <div class="logo">
      <div class="logo-icon">🤖</div>
      EMO Robot FR
    </div>
    <div class="nav-right">
      <span class="badge live" id="account-badge">@emorobotfrancais</span>
      <button class="btn btn-ghost btn-sm" onclick="logout()">Déconnexion</button>
    </div>
  </nav>

  <div id="app-body" style="padding:24px 32px;max-width:1200px;margin:0 auto">
    <!-- STATS -->
    <div class="stats">
      <div class="stat-card">
        <div class="label">Publications totales</div>
        <div class="value" id="stat-total">0</div>
        <div class="sub">depuis le début</div>
      </div>
      <div class="stat-card">
        <div class="label">Ce mois</div>
        <div class="value" id="stat-month">0</div>
        <div class="sub trend-up" id="stat-month-trend">↑ en cours</div>
      </div>
      <div class="stat-card">
        <div class="label">Planifiés</div>
        <div class="value" id="stat-scheduled">0</div>
        <div class="sub">à venir</div>
      </div>
      <div class="stat-card">
        <div class="label">Prochain post</div>
        <div class="value" style="font-size:1.1rem" id="stat-next">—</div>
        <div class="sub" id="stat-next-date">aucun planifié</div>
      </div>
    </div>

    <div class="grid2">
      <!-- PLANNING -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">📅 Planifier un post</span>
        </div>
        <div class="plan-form">
          <div>
            <label>Légende / Description</label>
            <textarea id="plan-caption" placeholder="🤖 Découvrez EMO Robot... #EMORobot #RobotIA"></textarea>
          </div>
          <div class="row">
            <div>
              <label>Date</label>
              <input type="date" id="plan-date">
            </div>
            <div>
              <label>Heure</label>
              <input type="time" id="plan-time" value="10:00">
            </div>
          </div>
          <div>
            <label>Source vidéo</label>
            <select id="plan-source">
              <option value="auto">🤖 Auto (scrape EMO officiel)</option>
              <option value="tiktok">TikTok @emo_robot_official</option>
              <option value="youtube">YouTube Living.ai</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="schedulePost()">✅ Planifier ce post</button>
        </div>
      </div>

      <!-- CALENDRIER -->
      <div class="card">
        <div class="card-header">
          <span class="card-title" id="cal-title">📆 Août 2026</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="changeMonth(-1)">‹</button>
            <button class="btn btn-ghost btn-sm" onclick="changeMonth(1)">›</button>
          </div>
        </div>
        <div class="calendar" id="calendar"></div>
      </div>
    </div>

    <!-- POSTS LIST -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">🎬 Historique & Posts planifiés</span>
        <button class="btn btn-ghost btn-sm" onclick="clearAll()">Tout effacer</button>
      </div>
      <div id="posts-list"><p style="color:var(--muted);font-size:.9rem;text-align:center;padding:20px">Aucun post encore. Planifie ton premier !</p></div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-header">
        <span class="card-title">⚙️ Setup local — Access Token</span>
      </div>
      <p style="color:var(--muted);font-size:.85rem;margin-bottom:10px">Copie ce token dans <code style="background:rgba(255,255,255,.08);padding:2px 6px;border-radius:4px">C:\\Emo Robot\\.env</code> → <code style="background:rgba(255,255,255,.08);padding:2px 6px;border-radius:4px">TIKTOK_ACCESS_TOKEN=...</code></p>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="token-display" type="password" readonly
          style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px 14px;color:var(--text);font-family:monospace;font-size:.8rem"
          value="">
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('token-display').type=document.getElementById('token-display').type==='password'?'text':'password'">👁</button>
        <button class="btn btn-sm" style="background:var(--purple)" onclick="navigator.clipboard.writeText(localStorage.getItem('tt_token')||'');showToast('Token copié !')">📋 Copier</button>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const CLIENT_KEY = "CLIENT_KEY_PLACEHOLDER";
const REDIRECT_URI = "REDIRECT_URI_PLACEHOLDER";
const SCOPES = "user.info.basic,video.publish,video.upload";
const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS_FR = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// ── AUTH ──────────────────────────────────────────────
function loginTikTok() {
  window.location.href = "/auth";
}

function logout() {
  localStorage.removeItem("tt_token");
  localStorage.removeItem("tt_user");
  location.reload();
}

// ── POSTS STORAGE ──────────────────────────────────────
function getPosts() {
  try { return JSON.parse(localStorage.getItem("emo_posts") || "[]"); } catch { return []; }
}
function savePosts(posts) {
  localStorage.setItem("emo_posts", JSON.stringify(posts));
}

// ── SCHEDULE ───────────────────────────────────────────
function schedulePost() {
  const caption = document.getElementById("plan-caption").value.trim();
  const date    = document.getElementById("plan-date").value;
  const time    = document.getElementById("plan-time").value;
  const source  = document.getElementById("plan-source").value;
  if (!date) { showToast("⚠️ Choisis une date", "#eab308"); return; }
  const posts = getPosts();
  posts.unshift({
    id: Date.now(),
    caption: caption || "🤖 Publication EMO Robot FR #EMORobot",
    datetime: date + "T" + (time || "10:00"),
    source,
    status: "scheduled",
    emoji: ["🤖","🎉","✨","💡","🔥"][Math.floor(Math.random()*5)],
  });
  savePosts(posts);
  document.getElementById("plan-caption").value = "";
  document.getElementById("plan-date").value = "";
  renderAll();
  showToast("✅ Post planifié !");
}

function clearAll() {
  if (confirm("Effacer tous les posts ?")) { savePosts([]); renderAll(); }
}

function deletePost(id) {
  savePosts(getPosts().filter(p => p.id !== id));
  renderAll();
}

function markPublished(id) {
  const posts = getPosts().map(p => p.id === id ? {...p, status:"published"} : p);
  savePosts(posts);
  renderAll();
  showToast("🎉 Post marqué comme publié !");
}

// ── RENDER ─────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderPosts();
  renderCalendar();
}

function renderStats() {
  const posts = getPosts();
  const now = new Date();
  const thisMonth = posts.filter(p => {
    const d = new Date(p.datetime);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const scheduled = posts.filter(p => p.status === "scheduled");
  const next = scheduled.sort((a,b) => new Date(a.datetime)-new Date(b.datetime))[0];

  document.getElementById("stat-total").textContent = posts.length;
  document.getElementById("stat-month").textContent = thisMonth.length;
  document.getElementById("stat-scheduled").textContent = scheduled.length;
  if (next) {
    const d = new Date(next.datetime);
    document.getElementById("stat-next").textContent = d.toLocaleDateString("fr-FR",{day:"numeric",month:"short"});
    document.getElementById("stat-next-date").textContent = d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  }
}

function renderPosts() {
  const posts = getPosts();
  const el = document.getElementById("posts-list");
  if (!posts.length) {
    el.innerHTML = '<p style="color:var(--muted);font-size:.9rem;text-align:center;padding:20px">Aucun post encore.</p>';
    return;
  }
  el.innerHTML = posts.slice(0,20).map(p => {
    const d = new Date(p.datetime);
    const dateStr = d.toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"}) +
      " à " + d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    const statusLabel = {published:"Publié",scheduled:"Planifié",draft:"Brouillon"}[p.status] || p.status;
    const actions = p.status === "scheduled"
      ? `<button class="btn btn-ghost btn-sm" onclick="markPublished(${p.id})">✓</button>
         <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deletePost(${p.id})">✕</button>`
      : `<button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deletePost(${p.id})">✕</button>`;
    return `
    <div class="post-item">
      <div class="post-thumb">${p.emoji||"🤖"}</div>
      <div class="post-info">
        <div class="post-title">${p.caption}</div>
        <div class="post-meta">${dateStr} · ${p.source}</div>
      </div>
      <span class="status ${p.status}">${statusLabel}</span>
      <div style="display:flex;gap:4px;margin-left:8px">${actions}</div>
    </div>`;
  }).join("");
}

function renderCalendar() {
  const title = document.getElementById("cal-title");
  title.textContent = "📆 " + MONTHS_FR[currentMonth] + " " + currentYear;

  const posts = getPosts();
  const postDays = new Set(posts.map(p => {
    const d = new Date(p.datetime);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear)
      return d.getDate();
    return null;
  }).filter(Boolean));

  const cal = document.getElementById("calendar");
  cal.innerHTML = DAYS_FR.map(d => `<div class="cal-head">${d}</div>`).join("");

  const first = new Date(currentYear, currentMonth, 1);
  const last  = new Date(currentYear, currentMonth+1, 0);
  let startDay = (first.getDay()+6)%7; // lundi=0

  for (let i=0; i<startDay; i++) {
    const d = new Date(currentYear, currentMonth, -startDay+i+1);
    cal.innerHTML += `<div class="cal-day other-month">${d.getDate()}</div>`;
  }

  const today = new Date();
  for (let d=1; d<=last.getDate(); d++) {
    const isToday = d===today.getDate() && currentMonth===today.getMonth() && currentYear===today.getFullYear();
    const hasPost = postDays.has(d);
    cal.innerHTML += `<div class="cal-day ${isToday?"today":""} ${hasPost?"has-post":""}" title="${hasPost?"Post planifié":""}">${d}</div>`;
  }
}

function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0)  { currentMonth = 11; currentYear--; }
  renderCalendar();
}

// ── TOAST ──────────────────────────────────────────────
function showToast(msg, color) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.borderColor = color||"var(--green)";
  t.style.color = color||"var(--green)";
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

// ── INIT ───────────────────────────────────────────────
function init() {
  // Vérifie si callback avec token dans l'URL
  const params = new URLSearchParams(location.search);
  const token = params.get("access_token");
  if (token) {
    localStorage.setItem("tt_token", token);
    history.replaceState({}, "", "/dashboard");
  }

  const storedToken = localStorage.getItem("tt_token");
  if (storedToken) {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app").style.display = "block";
    // Préremplit la date avec aujourd'hui
    document.getElementById("plan-date").valueAsDate = new Date();
    const td = document.getElementById("token-display");
    if (td) td.value = storedToken;
    renderAll();
  }
}

init();
</script>
</body>
</html>
""".replace("CLIENT_KEY_PLACEHOLDER", CLIENT_KEY).replace("REDIRECT_URI_PLACEHOLDER", REDIRECT_URI)


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = HTML.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass
