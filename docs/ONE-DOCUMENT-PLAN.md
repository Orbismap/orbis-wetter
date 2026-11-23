# Plan: Wetter und Orbis Maps als ein Dokument

Ziel: Die Wetterkarte wächst flüssig auf Vollbild, danach blenden die Menüs von Orbis Maps ein, und man ist in der
Karten-App. Kein Seitenwechsel, kein Blitz. Wetter und Orbis Maps bleiben getrennt installierbare PWAs.

Entscheidung: Der Wetter-Code zieht als `src/wetter/` in das Repo **orbis-map**. Ein Build, ein Deploy, zwei Domains.

```
wetter.maltee.dev  →  derselbe Build, startet im Wetter-Modus   (eigene PWA, eigene Origin)
maps.maltee.dev    →  derselbe Build, startet im Karten-Modus   (eigene PWA, eigene Origin)
```

Weil beide Origins denselben Build ausliefern, ist der Wechsel Wetter → Karte ein Zustandswechsel im selben Dokument
(`history.pushState`), keine Navigation. Die Dokument-übergreifende View Transition und `/wx-render/v1.js` entfallen.

## Phase 1 – Code zusammenführen (ohne Verhaltensänderung)

- Neuer Branch in orbis-map. `src/wetter/` mit dashboard, widgets, features, data, api, styles aus dem Wetter-Repo
  (Stand: Branch `claude/wetter-app-mobile-layout-edaf7c`, inkl. PR #6).
- Gemeinsame Abhängigkeiten stimmen schon überein (`preact`, `maplibre-gl@^6.17`, `vite@7`); Wetter braucht nichts Neues.
- Einstieg nach Hostname/Modus: `src/main.tsx` wählt `<WetterApp />` oder `<App />`. Lokal per `?mode=wetter`.
- `base: './'` statt `/wetter/`; Wetter-Assets (Icons, Mond) nach `public/wetter/`.
- Tests und Typecheck beider Teile laufen im selben `pnpm test` / `pnpm typecheck`.
- **Fertig, wenn:** `maps.maltee.dev` verhält sich wie vorher und der Wetter-Modus läuft lokal identisch zu heute.

## Phase 2 – Hosting und PWAs

- `wrangler.jsonc`: ein Worker, zwei Custom Domains (`maps.maltee.dev`, `wetter.maltee.dev`).
- Manifest pro Host: ein kleiner Worker (oder Runtime-Auswahl) liefert `manifest.webmanifest` je nach Hostname
  (eigene `id`, `name`, `start_url`, Icons). Scope jeweils `/`, dank getrennter Origins gibt es keine Verschachtelung.
- Service Worker pro Origin (Precache wie heute in `src/pwa/`, ohne `/wetter/`-Präfix).
- Alte Adresse: `maps.maltee.dev/wetter/*` → 301 auf `wetter.maltee.dev/`.
- **Hinweis:** `localStorage` gilt pro Origin, gespeicherte Wetter-Layouts fangen unter `wetter.maltee.dev` neu an.

## Phase 3 – Eine Karte für beides

- Die MapLibre-Instanz (`createMapEngine`) lebt in einer festen Ebene über der App, nicht mehr in der Wetter-Karte.
  Im Wetter-Modus liegt sie genau auf dem Platz des Kartenwidgets (Rechteck per `ResizeObserver` und beim Scrollen
  nachgeführt, auch im Bearbeiten-Modus).
- Der Wetterlayer läuft über den Renderer direkt als Import, ohne Versionsvertrag und ohne Fallback-Pfad über das Netz.
- Der Orbis-Engine startet im Wetter-Modus **schlank**: nur Basiskarte und Wetterlayer. 3D-Gebäude, Erweiterungen und
  Pro-Teile laden erst nach dem Vergrößern (lazy), damit der Wetter-Start nicht schwerer wird.
- **Risiko:** Größe der Engine und ihr Startverhalten sind noch nicht geprüft. Das wird als Erstes in Phase 3 gemessen.

## Phase 4 – Der Übergang

- Vergrößern: das Rechteck der Karte animiert (bestehende `expandMap`-Logik, `map.resize()` pro Frame) auf die volle
  Fläche, die Karte bleibt scharf.
- Danach blenden Orbis-HUD (Desktop oder Mobil) und das Wetter-Detailmenü ein. URL wird per `pushState` auf das
  Hash-Format von orbis-karten gesetzt (`#/@lat,lng,z?k=wetter&l=…`).
- Zurück: Chip „Zurück zum Wetter“ (heute `ReturnFromWetter`) wird zu einer App-internen Rückanimation. Browser-Zurück
  funktioniert über denselben Zustand.
- `prefers-reduced-motion`: direkter Wechsel ohne Animation.

## Phase 5 – Aufräumen und Umstellung

- Wetter-Repo archivieren, `docs/HANDOFF.md` durch dieses Konzept ersetzen.
- `@view-transition`-Regeln, `wx-render` (Build, Proxy, Versionsprüfung) und `sessionStorage`-Rückweg entfernen.
- Reihenfolge beim Livegang: Domain und Manifeste zuerst, dann Umleitung der alten Wetter-Adresse, zuletzt
  Weiterleitungs-Hinweis für bereits installierte PWAs.

## Offene Punkte

- Wie schwer ist der Orbis-Engine beim Start im Wetter-Modus (Phase 3, vorher messen)?
- Soll `wetter.maltee.dev` nach dem Vergrößern die volle Orbis-Oberfläche zeigen (Plan) oder nur eine reduzierte?
- orbis-map hat mehrere laufende Worktrees und Branches; Phase 1 sollte auf einem frischen `origin/main` starten.
