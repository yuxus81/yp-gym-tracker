# YP Gym Tracker

Trainings-Tracker fürs iPhone als Web-App (PWA). Trainingsplan, Session-Logging mit Satzarten
(Aufwärmen, Arbeitssatz, Drop-Satz mit Stufen, bis Versagen), Verlauf mit Filtern und Kurven.
**Funktioniert komplett ohne Netz**, gleicht mit Supabase ab, sobald wieder Empfang da ist.

## Wie die Offline-Fähigkeit funktioniert

- Die Oberfläche liest und schreibt **nur** in IndexedDB (Dexie, `src/db/`). Kein Tippen wartet aufs Netz.
- Jede geänderte Zeile bekommt `dirty = 1`. `src/sync/sync.ts` lädt sie per Upsert hoch und markiert sie
  erst nach Bestätigung als sauber. Danach werden neue Server-Zeilen seit dem letzten Stand geholt.
- Lokal ungesicherte Änderungen gewinnen immer. Gelöscht wird nie hart, sondern über `deleted_at`.
- Der Service Worker (vite-plugin-pwa) hält alle Dateien vor — die App startet im Flugmodus.
- Abgleich: beim Start, bei Netz-Rückkehr, beim Zurückholen der App, 2 s nach jeder Änderung, jede Minute.
- **iPhone:** Nur als installierte App (Safari → Teilen → „Zum Home-Bildschirm“) sind die lokalen Daten
  vor der 7-Tage-Löschregel von Safari geschützt.

## Einrichtung

1. Supabase-Projekt anlegen, `supabase/schema.sql` im SQL-Editor ausführen.
2. Authentication → Users → eigenes Konto anlegen (E-Mail + Passwort).
3. Authentication → Sign In / Providers → **„Allow new users to sign up“ ausschalten.**
4. `.env.example` nach `.env.local` kopieren, URL + Publishable Key eintragen.
5. `npm install` · `npm run dev`

## Deploy (GitHub Pages)

- Repo → Settings → Secrets and variables → Actions → **Variables**:
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Settings → Pages → Source: GitHub Actions. Jeder Push auf `main` baut und veröffentlicht.
- `keep-alive.yml` pingt Supabase alle 5 Tage (Free-Tier pausiert sonst nach 7 Tagen).

## Befehle

| | |
|---|---|
| `npm run dev` | Entwicklung (ohne Supabase-Daten: reiner Gerätemodus) |
| `npm test` | Tests (Sync-Zusammenführung, Berechnungen) |
| `npm run build` | Typprüfung + Build inkl. Service Worker |
| `node scripts/icons.mjs` | App-Icons aus `public/icon.svg` neu erzeugen |
