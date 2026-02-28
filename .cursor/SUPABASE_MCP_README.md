# Plugin Supabase pour Cursor

## 1. Installer depuis le Cursor Marketplace

1. Ouvre **Cursor**.
2. Va sur le **Marketplace** : `Cursor` → **Plugins** / **Marketplace** (ou panneau Extensions).
3. Cherche **"Supabase"**.
4. Clique sur **Install** pour le plugin officiel Supabase.

Le plugin ajoute le MCP Supabase (outils + skills) pour gérer ton projet depuis Cursor.

---

## 2. Configurer le MCP (`.cursor/mcp.json`)

Ce projet contient déjà une config dans `.cursor/mcp.json` qui pointe vers le serveur MCP Supabase.

**À faire une seule fois :**

1. Ouvre **Supabase** → [Account → Access Tokens](https://supabase.com/dashboard/account/tokens).
2. Crée un **Personal Access Token** (pas la anon key).
3. Ouvre `.cursor/mcp.json` et remplace `REMPLACE_MOI_ACCESS_TOKEN` par ton token.
4. Le `x-supabase-project-ref` est déjà `axwwpawvezqsybttulyo` (ton projet).
5. **Redémarre Cursor** complètement (quit puis rouvre) pour que le MCP se charge.

Après ça, tu peux demander dans le chat Cursor par exemple :
- "Show me the subscriptions table schema"
- "List my Supabase tables"
- "Generate a migration for …"

---

## 3. Références

- [Cursor Marketplace](https://cursor.com/marketplace)
- [Supabase Plugin (GitHub)](https://github.com/supabase-community/cursor-plugin)
- [Supabase MCP](https://supabase.com/mcp)
