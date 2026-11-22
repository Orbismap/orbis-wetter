# Orbis Wetter

Die Wetter-App von Orbis. Liegt unter **https://maps.maltee.dev/wetter/** – auf derselben Origin wie
[orbis-karten](https://maps.maltee.dev/), damit die kleine Wetterkarte nahtlos in die große Karte übergehen kann.
Technik wie im Karten-Repo: Vite, TypeScript, Preact, MapLibre GL JS 6.

```sh
pnpm install
pnpm dev          # http://localhost:5173/wetter/
pnpm build        # Typprüfung + Produktionsbau nach dist/
pnpm test         # Vitest
pnpm typecheck
```

## Stand

Feste 6×5-Widget-Raster mit **15 echten Widgets** (Stundenleiste, 10-Tage-Vorhersage, Windkarte,
Detailkarten …), die über einen `WeatherProvider` mit Beispieldaten versorgt werden. Im Bearbeitungsmodus lassen
sich die Widgets per Ziehen neu anordnen; die Anordnung bleibt lokal gespeichert. Skalieren, echte Wetterdaten und
Mobil-Layout sind noch offen.

## Architektur

```
src/
  dashboard/          Grid-Engine
    types.ts          GridPreset, Placement, LayoutState
    presets.ts        Raster-Presets (desktop 6×5 / wide 8×5), registrierbar
    geometry.ts       Zellmaße, Kollisionen, freie Plätze, Clamping (rein, getestet)
    store.ts          LayoutStore: move / resize / add / remove + useLayout()
    defaultLayout.ts  Standard-Anordnung je Preset
    Dashboard.tsx     zeichnet die Grid-Fläche
    WidgetFrame.tsx   positioniert ein Widget anhand seiner Zelle
  widgets/            Widget-Vertrag
    types.ts          WidgetDefinition mit Varianten (1×1, 2×2, 3×2, …)
    registry.ts       Registrierung nach id
    placeholder.tsx   temporärer Inhalt
    register.ts       registriert alle Widgets (aktuell alles Platzhalter)
```

Das Desktop-Raster ist **6 Spalten × 5 Zeilen** auf festen **950 px** Breite; der Canvas skaliert nicht mit dem
Fenster, sondern wird zentriert (bei schmaleren Fenstern wird gescrollt). Weitere Rastergrößen sind Presets – der
Preset-Auswahl im Kopf testet `desktop` und `wide`. Jede Placement speichert `x, y, w, h` in Zellkoordinaten; die
Pixelposition wird daraus berechnet. Der `LayoutStore` validiert jede Änderung gegen Rastergrenzen und
Kollisionen.

**Anordnen:** Der Schalter im Kopf aktiviert den Bearbeitungsmodus. Widgets lassen sich per Pointer/Ziehen in
Rasterzellen verschieben; das Ziel snapt auf die nächste Zelle, ein belegtes Ziel tauscht die beiden Widgets.
Die Anordnung wird in `localStorage` gespeichert (`orbis.wetter.layout.v1`), „Zurücksetzen" stellt das Standardraster
wieder her. Skalieren der Widgets kommt später – die `resize`-Aktion im Store ist schon vorbereitet.

Das Ziehen ist flüssig animiert: Während der Bewegung schreibt `useDrag.ts` den `translate3d` direkt ins DOM (kein
Re-Render pro Pointermove). Sobald die Zielzelle erreicht ist, wird **live getauscht** – das andere Widget weicht
bereits während des Ziehens aus und wird per **FLIP** über die Web Animations API animiert. `flip.ts` übernimmt auch
das sanfte Einrasten des gezogenen Widgets beim Loslassen. Nur `transform` wird animiert (GPU-composited),
`prefers-reduced-motion` wird respektiert.

Überlappungen sind ausgeschlossen: `move` und `hoverSwap` im Store validieren Rastergrenzen **und** Kollisionen
mit allen anderen Widgets. Beim Laden verwirft `persistence.ts` gespeicherte Anordnungen, die nicht mehr gültig
sind (z. B. aus älteren Versionen).

**Gruppen-Tausch:** `hoverSwap()` berechnet jede Vorschau aus dem Ursprung des Zugs. Das gezogene Widget tauscht
sowohl mit einem einzelnen Widget als auch mit einer **Gruppe**, die seine alte Fläche exakt ausfüllt – ein 1×2
mit zwei 1×1, das 2×3-Widget mit seinen fünf kleineren Nachbarn. `packIntoCells()` sucht die Anordnung per
Exact-Cover; passt die Fläche nicht, wird der Zug abgelehnt. Hovert man ein neues Ziel, springt die zuvor
getauschte Gruppe wieder auf ihren Ursprung zurück – es ist immer nur **eine** Tauschbeziehung aktiv. Rotation
oder Kettenverschiebungen gibt es bewusst nicht.

**Sichtbare Tauschzellen:** Während des Ziehens zeigt `dragPreview.ts` zwei Overlays über dem Raster: die
**Ursprungszelle** mit fester Outline (farbig, `border-radius` wie die Karten) und die **Zielzelle** gestrichelt.
So ist jederzeit erkennbar, welche Fläche getauscht wird. Die Overlays stammen aus demselben Ursprungs-Snapshot
und verschwinden beim Ablegen.

**Ursprung pro Zug:** `beginGesture()` merkt sich beim Ziehen die Position **aller** Widgets – auch der gezogenen.
Verlässt der Pointer das Grid (oder wird der Zug abgebrochen), setzt `restoreOrigin()` die komplette Anordnung auf
diesen Stand zurück. Das Widget wird dabei halbtransparent, solange es außerhalb liegt; die Rückkehr animiert wieder
per FLIP. `endGesture()` verwirft den Schnappschuss nach einem regulären Ablegen.

**Neues Widget hinzufügen:** Datei unter `src/widgets/` anlegen, die eine `WidgetDefinition` exportiert (Titel,
unterstützte `variants`, `Component`), in `src/widgets/register.ts` registrieren und eine `Placement` in
`src/dashboard/defaultLayout.ts` setzen. Die Grid-Engine muss nicht verändert werden.

## Übergang zur Karte

Der Vertrag steht in [docs/HANDOFF.md](docs/HANDOFF.md). Kurz: Der Vollbild-Link ist ein echtes `<a>`, die
Wetterkarte trägt `view-transition-name: wx-map`, und die URL übernimmt Center/Zoom sowie die Karte `wetter`.
orbis-karten springt wegen seines `jumpTo`-Verhaltens ohne Fluganimation an genau diese Position.

## Deployment

`wrangler.jsonc` served `dist/` über die Route `maps.maltee.dev/wetter/*`. Der Workflow
`.github/workflows/deploy.yml` läuft bei Push auf `main` und braucht die Secrets `CLOUDFLARE_API_TOKEN` und
`CLOUDFLARE_ACCOUNT_ID` (wie im Karten-Repo).
