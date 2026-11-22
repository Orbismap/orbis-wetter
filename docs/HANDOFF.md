# Handoff: Wetterkarte → orbis-karten

Der Übergang soll so aussehen, als würde die kleine Karte einfach groß werden. Das funktioniert nur, weil beide
Apps auf **derselben Origin** liegen (`maps.maltee.dev`). Es gibt kein Shared-Paket; die wenigen gemeinsamen
Werte stehen hier und sind auf der anderen Seite gespiegelt.

## 1. View Transition

Beide Dokumente opten ein – in einem globalen Stylesheet:

```css
@media (prefers-reduced-motion: no-preference) {
  @view-transition { navigation: auto; }
}
```

Die Kartenfläche trägt in **beiden** Apps exakt denselben Namen:

```css
.wx-map { view-transition-name: wx-map; }
```

In orbis-karten sitzt die Klasse am Wrapper in `src/app/MapView.tsx`, hier an `.wx-map` in
`src/features/forecast/MapCard.tsx`. Nur die Kartenfläche, keine Panels.

Der Vollbild-Button ist ein `<button>`: Er lässt die Karte per rAF-Animation auf 100 % waachsen und navigiert
erst danach per `location.href`. (Ein `<a>` wäre für `navigation: auto` nicht zwingend; der Button wird wegen der
Voranimation gebraucht.) Ohne Browser-Unterstützung (aktuell Firefox) bleibt es ein normaler Seitenwechsel.

## 1b. Gemeinsamer Renderer (seit v1)

Die Wetterlayer werden **nicht** nachgebaut, sondern zur Laufzeit vom Karten-Repo geladen.

```
https://maps.maltee.dev/wx-render/v1.js
```

- orbis-karten baut das Modul mit `pnpm build:render` (`vite.render.config.ts`) nach `public/wx-render/`
  und liefert es dadurch unter `/wx-render/`. Der normale Build kopiert es nach `dist/wx-render/`.
- wetter importiert es dynamisch in `src/features/forecast/sharedRenderer.ts` (`@vite-ignore`) und ruft
  `mountWeatherLayer(map, { mode, beforeId: 'places', onStatus })`. Lokal proxyt Vite `/wx-render`
  auf den Karten-Dev-Server (`localhost:5173`).
- Die API ist versionsgepinnt: `WX_RENDER_VERSION` muss `1` sein. Ein breaking change im Renderer muss als
  `v2.js` erscheinen, damit beide Deploys unabhängig bleiben.
- Fällt das Modul aus, greift wetters eigener CPU-Raster-Fallback (`applyMapLayer.ts`) – nicht pixelgleich,
  aber die Karte bleibt benutzbar.

Die exakten Farbskalen (Wind, Temperatur, Niederschlag, Radar-LUT) liegen nur im Karten-Repo
(`src/render/gl/scales.ts`, `radar-values.ts`). Bei Änderungen dort ändert sich auch die kleine Karte –
ohne Code-Änderung in diesem Repo.

## 2. URL

`buildKartenUrl()` in `src/features/handoff/url.ts` erzeugt die Ziel-URL im Hash-Format von orbis-karten.
Der Windkarten-Modus (`wind`) wird übergeben, solange die kleine Karte Wind zeigt:

```
#/@51.1657,10.4515,5.37z?k=wetter&l=radar&g=0&s=0
```

- `@lat,lng,zoomz` – Center und Zoom der kleinen Karte. orbis-karten wendet externe Camera-Updates per
  `jumpTo` an (`src/map/engine.ts`), es gibt also keine Fluganimation und keinen Umbau auf der Kartenseite.
- `k=wetter` – die Karte, deren Detailmenü beim Übergang offen geht.
- `l=…` – Layer des gewählten Kartenmodus: `radar→radar`, `precip→niederschlag`, `temp→temperatur`, `wind→wind`.
  `k=` und `l=` werden **gemeinsam** in der URL behalten (`serializeHash()` schreibt beides, solange das
  Detailmenü offen ist). Das Karten-Detail bleibt damit stabil und die URL wird nicht nachträglich umgeschrieben.
- `g=0` – Mercator, damit die Projektion identisch bleibt.
- `s=0` – die Hauptseitenleiste von orbis-karten ist eingeklappt, damit das Karten-Detail Platz hat.
- Optional `p=lat,lng,Name,Region` für den Ort im Detailmenü. Kommas bleiben **roh**, die Einzelteile werden
  percent-encoded – sonst kann `parseHash()` den Ort nicht lesen.

## 3. Rückweg

Vor der Navigation schreibt `rememberReturnTo()` den aktuellen Pfad in `sessionStorage`:

```
orbis.wetter.returnTo = /wetter/
```

orbis-karten liest und löscht den Schlüssel beim Start und zeigt einen Chip „Zurück zur Wetter-App".
Der Schlüssel ist absichtlich in `src/features/handoff/contract.ts` definiert und in `src/app/ReturnFromWetter.tsx`
des Karten-Repos gespiegelt.

## Bekannte Ecke

Die View Transition snapt die Zielseite beim ersten Paint. Wenn die Karten-Kacheln dann noch nicht da sind,
endet die Animation auf einer leeren Fläche. Das ist mit dem Karten-Repo gemeinsam zu tun (z. B. Placeholder
oder Ladezustand mit demselben Namen), sobald echte Wetterlayer die kleine Karte füllen.
