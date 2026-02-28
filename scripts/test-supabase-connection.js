/**
 * Test de connexion Supabase (env + API REST)
 * Usage: npm run test:supabase
 * Charge .env.local automatiquement s'il existe.
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const roots = [join(__dirname, ".."), process.cwd()];
for (const root of roots) {
  for (const name of [".env.local", ".env"]) {
    const envPath = join(root, name);
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, "utf8");
      content.split(/\r?\n/).forEach((line) => {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
      });
      break;
    }
  }
  if (process.env.VITE_SUPABASE_URL) break;
}

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("❌ Variables manquantes. Vérifie .env.local (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)");
  process.exit(1);
}

console.log("🔗 URL:", url);
console.log("🔑 Key:", key.slice(0, 20) + "...");

async function test() {
  try {
    const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    if (!res.ok) {
      const t = await res.text();
      console.log("⚠️ Réponse API:", res.status, t.slice(0, 120));
      if (res.status === 401 || res.status === 403) console.log("   → Connexion OK, accès refusé (RLS ou clé).");
    } else {
      const data = await res.json();
      console.log("✅ Connexion Supabase OK. profiles:", Array.isArray(data) ? data.length : 0, "ligne(s)");
    }
  } catch (err) {
    console.error("❌ Erreur:", err.message);
    process.exit(1);
  }
}

test();
