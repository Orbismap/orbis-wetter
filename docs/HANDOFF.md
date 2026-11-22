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
`src/features/forecast/WindMapCard.tsx`. Nur die Kartenfläche, keine Panels.

Wichtig: Der Vollbild-Button muss ein echtes `<a href="…">` sein. `navigation: auto` greift nur bei
nutzerinitiierten Navigationen – `location.href = …` aus JavaScript löst keine Cross-Document-Transition aus.
Ohne Browser-Unterstützung (aktuell Firefox) bleibt es ein normaler Seitenwechsel.

## 2. URL

`buildKartenUrl()` in `src/features/handoff/url.ts` erzeugt die Ziel-URL im Hash-Format von orbis-karten.
Der Windkarten-Modus (`wind`) wird übergeben, solange die kleine Karte Wind zeigt:

```
#/@51.1657,10.4515,5.37z?k=wetter&l=radar&g=0
```

- `@lat,lng,zoomz` – Center und Zoom der kleinen Karte. orbis-karten wendet externe Camera-Updates per
  `jumpTo` an (`src/map/engine.ts`), es gibt also keine Fluganimation und keinen Umbau auf der Kartenseite.
- `k=wetter` – die vorhandene Standard-Karte „Wetter" in `src/karten/standard.ts`.
- `l=…` – Layer des gewählten Kartenmodus: `radar→radar`, `precip→niederschlag`, `temp→temperatur`, `wind→wind`.
- `g=0` – Mercator, damit die Projektion identisch bleibt.
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
