# RoomVision — fase 1

Een Nederlandstalige 360°-studio met Next.js App Router, TypeScript, Tailwind CSS en Three.js. De viewer projecteert een echt equirectangulair panorama op de binnenkant van een 3D-bol. Er is geen account, database of API-sleutel nodig.

## Installeren en openen

Gebruik Node.js **22.6 of hoger** (getest met 24.19) en npm.

```bash
cd /workspace/Roomvision # of je eigen checkout
npm ci
npm run dev -- --hostname 0.0.0.0
```

Open op je eigen computer `http://localhost:3000` voor de homepage en `http://localhost:3000/studio` voor de studio. In een cloudomgeving gebruik je de poortweergave van je ontwikkelomgeving voor poort **3000**, indien beschikbaar. Deze app publiceert zichzelf niet op internet. Voor een fysieke telefoon op hetzelfde netwerk: open `http://<IP-van-je-computer>:3000`; eventuele firewall moet poort 3000 toestaan.

Als de cloudmachine niet naar de standaard npm-cache mag schrijven:

```bash
npm_config_cache=/tmp/roomvision-npm npm ci
```

## Gebruik

- Sleep met de muis of veeg met een vinger om 360° rond te kijken.
- Scroll, knijp met twee vingers of gebruik +/− om te zoomen.
- Geef de viewer toetsenbordfocus en gebruik pijltjes, +/− en Home.
- De herstelknop zet kijkrichting en zoom terug.
- Open een eigen JPG-, PNG- of WebP-bestand. De foto wordt alleen lokaal in de browser gelezen, niet verstuurd of opgeslagen. Na herladen verschijnt het voorbeeld weer.
- Gebruik een volledig 360°-equirectangulair panorama met **2:1-verhouding** (1% afrondingstolerantie), minimaal 1024 × 512 en maximaal 8192 × 4096 pixels en 25 MB. Ook de maximale textuurgrootte van de GPU wordt gecontroleerd.
- Gewone foto's en smalle telefoonpanorama's zijn ongeschikt. De app controleert formaat, bestandsgrootte, leesbaarheid, resolutie en verhouding. De equirectangulaire projectie is niet automatisch uit beeldinhoud vast te stellen: een gewone foto die tot 2:1 is bijgesneden kan de controles passeren maar wordt vervormd weergegeven.
- WebGL en hardwareversnelling zijn vereist; bij een niet-beschikbare WebGL-context verschijnt uitleg.

## Controleren

```bash
npm test             # tests voor bestands- en panorama-validatie
npm run lint         # ESLint
npm run typecheck    # route-types en TypeScript
npm run build        # productiebuild
npm run start -- --hostname 0.0.0.0
```

Browsercontroles met Playwright (voer eerst `npm run build` uit):

```bash
npx playwright install chromium
npm run test:e2e
```

Met de systeem-Chromium van de cloudmachine is geen browserdownload nodig:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

De browsertests controleren navigatie, een echte WebGL-context en veranderende canvasbeelden bij slepen/zoomen, reset, toetsenbord, geldige upload, ongeldig bestandstype, beschadigd bestand, verkeerde verhouding, mobiel formaat, aanraakbediening en knijpzoomen. Mobiele controles gebruiken Chromium-emulatie; er zijn geen fysieke iOS- of Android-apparaten getest.

## Structuur

- `app/page.tsx`: homepage.
- `app/studio/page.tsx`: studio.
- `components/Studio.tsx`: lokale upload, bediening en foutmeldingen.
- `components/PanoramaViewer.tsx`: Three.js-renderer, camera, touch, toetsenbord en opruimen van GPU-middelen.
- `lib/panorama.ts`: bestands- en resolutiecontroles.
- `public/demo-panorama.jpg`: lokaal meegeleverde 2:1-testfoto.
- `TASKS.md`: afgeronde scope en toekomstige planning.

Fase 1 bevat geen oppervlakteherkenning, kleurmaskers, AI, offertefunctionaliteit of opslag.

## Voorbeeldfoto en licentie

Het testpanorama is **Jordan Pond**, door **Matthew Petroff**: een echte 4096 × 2048-equirectangulaire buitenfoto uit [Pannellum](https://github.com/mpetroff/pannellum/blob/99f4afd686e807d374a764231a58255f7dd853b6/examples/examplepano.jpg). De foto is ongewijzigd meegeleverd onder [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Bron, attributie en licentiemelding staan ook in `public/demo-panorama-CREDITS.txt` en `public/demo-panorama-LICENSE.txt`. De viewer zelf gebruikt Three.js; Pannellum is geen runtime-afhankelijkheid. Je kunt het testpanorama in de studio vervangen door je eigen interieurpanorama.

### Ontwikkelhost in de cloud

Next.js staat in ontwikkelmodus standaard `localhost` toe; dit project staat daarnaast `127.0.0.1` toe. Gebruik je een externe poortweergave of het LAN-adres van je computer, geef dan de exacte hostnaam (zonder schema, pad of poort) mee en herstart de server:

```bash
ROOMVISION_DEV_ORIGIN=jouw-ontwikkelhost.example npm run dev -- --hostname 0.0.0.0
```

Voor een telefoon via je LAN is dit bijvoorbeeld het IP-adres van je computer. In productiemodus (`npm run build` en `npm start`) is deze ontwikkelinstelling niet nodig.
