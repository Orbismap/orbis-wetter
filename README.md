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

Feste 6×5-Widget-Raster mit **15 echten Widgets** (Stundenleiste, 10-Tage-Vorhersage, Wetterkarte,
Detailkarten …), die über einen `WeatherProvider` mit **echten Wetterdaten** versorgt werden. Echte Ortsuche
via Open-Meteo, echte 2D-Wetterlayer (ICON aus R2, Radar von RainViewer). Im Bearbeitungsmodus lassen sich die
Widgets per Ziehen neu anordnen; die Anordnung bleibt lokal gespeichert. Skalieren und Mobil-Layout sind noch offen.

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
Fenster, sondern wird zentriert (bei schmaleren Fenstern wird gescrollt). Weitere Rastergrößen sind Presets in
`presets.ts` (`desktop`, `wide`) – die UI hat bewusst keinen Preset-Umschalter. Jede Placement speichert `x, y, w, h`
in Zellkoordinaten; die
Pixelposition wird daraus berechnet. Der `LayoutStore` validiert jede Änderung gegen Rastergrenzen und
Kollisionen.

**Kopfzeile:** Oben links stehen das Wortmarken-Logo (Icon + „Wetter") und das Suchfeld. Die Suche ist echt:
`data/geocoding.ts` fragt die Open-Meteo-Geokodierung (keyless, CORS `*`), `CitySearch.tsx` debounct die Eingabe
(250 ms), bricht alte Anfragen ab und bietet Tastatursteuerung. Die Auswahl lädt Wetter und Kartenlayer für die
Koordinaten des gefundenen Orts.

## Datenquellen

Reihenfolge in `data/weather.ts` (`loadWeather`):

1. **Live-API als Standard:** Open-Meteo (`models=icon_global`) liefert eine kompakte Punktvorhersage derselben
   Modellfamilie. `data/openMeteo.ts` holt zusätzlich die 10-Tage-Werte, Sonnenauf-/untergang, UV, Sichtweite und
   die Luftqualität (CAMS).
2. **R2 nur als Fallback:** Wenn Open-Meteo scheitert, liefert `orbis-wetter.maltee.dev` ICON-Felder im OWX-Format.
   `data/owx.ts` dekodiert genau den 45°-Tile des Ortes (8 Variablen, ~10 MB) und sampled daraus die 25
   dreistündlichen Schritte. Fällt ein Tile aus, wird die gröbere 0,5°-Übersicht genommen. Da der Spiegel nicht
   immer aktuell ist, werden Läufe älter als 12 Stunden verworfen (`MAX_ICON_AGE`).
3. **DWD-Warnungen** kommen direkt aus dem WFS von `maps.dwd.de` (CORS `*`). Die Abfrage dauert mehrere Sekunden,
   deshalb wird sie nachgeladen und in das bestehende View Model gemergt, statt das Raster zu blockieren.
4. **Beispieldaten** greifen nur, wenn Open-Meteo *und* der R2-Fallback scheitern oder veraltet sind.

Die aktive Quelle steht als kleine Zeile unter der Hero (z. B. „Quelle: ICON · R2 · Lauf 12 UTC"). Alle Hosts sind
über `VITE_WETTER_BASE`, `VITE_LIVE_BASE` und `VITE_DATA_BASE` in `data/endpoints.ts` überschreibbar. Der
View-Model-Aufbau ist rein (`data/weather.ts::buildWeather`) und getestet; er kann ohne Netz geprüft werden.

**Anordnen:** Der Button an der oberen rechten Ecke des Grids aktiviert den Bearbeitungsmodus, daneben steht
„Zurücksetzen". Widgets lassen sich per Pointer/Ziehen in Rasterzellen verschieben; das Ziel snapt auf die nächste
Zelle. Die Anordnung wird in `localStorage` gespeichert (`orbis.wetter.layout.v1`). Skalieren der Widgets kommt
später – die `resize`-Aktion im Store ist schon vorbereitet. Eine Navbar und einen Preset-Umschalter gibt es nicht.

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
Exact-Cover; passt die Fläche nicht, greift der **dynamische Korridor**: Alle Widgets zwischen Ursprung und
Ziel rutschen um genau die Größe des gezogenen Widgets in die Gegenrichtung – vertikal wie horizontal. So
lässt sich auch ein 2×1-Widget mit einem 2×2 tauschen oder eine 4×1-Zeile ans untere Ende ziehen, während der
gesamte Stapel nachrückt. Hovert man ein neues Ziel, springt die zuvor getauschte Gruppe wieder auf ihren
Ursprung zurück – es ist immer nur **eine** Tauschbeziehung aktiv.

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

## Wetterkarte und Ebenen

Statt eines Vergrößerungs-Buttons sitzt rechts in der Kartentitelzeile ein **Layer-Icon**. Es öffnet ein Menü mit
den vier Ebenen `Radar`, `Niederschlag`, `Temperatur` und `Wind` (`features/forecast/mapLayers.ts`).

Die Ebenen sind **echte Flächenlayer**, keine Punkte: `applyMapLayer.ts` lädt für Temperatur/Wind/Niederschlag
**viewport-abhängig** aus **R2** (primär, wie bei orbis-karten) – unter Zoom 4 die 0,5°-Weltübersicht, darüber genau
die 45°-Tiles, die den aktuellen Kartenausschnitt schneiden. Bei `moveend` werden benötigte Tiles nachgeladen und
nicht mehr sichtbare entfernt. Jedes Feld wird über `fieldLayers.ts` in ein georeferenziertes Canvas-Bild gerendert
und als `raster`-Layer unter den Ortsbeschriftungen eingehängt. Wind nutzt `u`/`v` als Betrag, Farbskalen liegen in
`fieldLayers.ts`. Radar kommt – wie bei orbis – aus den keylosen RainViewer-Kacheln, die von sich aus auf Zoom und
Position reagieren.
Es gibt bewusst **keine Stadt-Punkte** mehr, nur den Marker des gewählten Orts. Der Vollbild-Link ist ins Menü
gewandert und übernimmt die gewählte Ebene als `l=`-Parameter. Bei einem Ortswechsel fliegt die Karte zum neuen
Ort; der **5-Sekunden-Timer startet erst nach einer eigenen Interaktion** (`pointerdown`, `wheel`, `touchstart`,
`keydown` auf der Kartenfläche) und fliegt dann auf die Ursprungsposition (gewählter Ort, Zoom 6) zurück. Mounten,
Ortswechsel und die eigenen Kamerabewegungen starten ihn nicht.

## Übergang zur Karte

Der Vertrag steht in [docs/HANDOFF.md](docs/HANDOFF.md). Kurz: Der Vollbild-Link ist ein echtes `<a>`, die
Wetterkarte trägt `view-transition-name: wx-map`, und die URL übernimmt Center/Zoom, die Karte `wetter` und die
aktive Ebene. orbis-karten springt wegen seines `jumpTo`-Verhaltens ohne Fluganimation an genau diese Position.

## Deployment

`wrangler.jsonc` served `dist/` über die Route `maps.maltee.dev/wetter/*`. Der Workflow
`.github/workflows/deploy.yml` läuft bei Push auf `main` und braucht die Secrets `CLOUDFLARE_API_TOKEN` und
`CLOUDFLARE_ACCOUNT_ID` (wie im Karten-Repo).
