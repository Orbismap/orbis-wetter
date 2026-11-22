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

Desktop-Layout nach Designreferenz: Hero, Stundenleiste, 10-Tage-Vorhersage, Luftqualität, Wind, Windkarte,
Warnung und die kleinen Detailkarten. Die Werte kommen aus `src/features/forecast/sample.ts` – **statische
Beispieldaten**, kein Live-API. Die Windkarte zeigt Stationen und den Standort-Marker; beim Klick auf „⤢" geht es
nahtlos in die große Karte von orbis-karten. Die kleinen Detailkarten sind schon als Buttons angelegt, bekommen
aber erst später Inhalte. Hintergrundbild und Mobil-Layout sind bewusst noch nicht drin.

## Übergang zur Karte

Der Vertrag steht in [docs/HANDOFF.md](docs/HANDOFF.md). Kurz: Der Vollbild-Link ist ein echtes `<a>`, die
Wetterkarte trägt `view-transition-name: wx-map`, und die URL übernimmt Center/Zoom sowie die Karte `wetter`.
orbis-karten springt wegen seines `jumpTo`-Verhaltens ohne Fluganimation an genau diese Position.

## Deployment

`wrangler.jsonc` served `dist/` über die Route `maps.maltee.dev/wetter/*`. Der Workflow
`.github/workflows/deploy.yml` läuft bei Push auf `main` und braucht die Secrets `CLOUDFLARE_API_TOKEN` und
`CLOUDFLARE_ACCOUNT_ID` (wie im Karten-Repo).
