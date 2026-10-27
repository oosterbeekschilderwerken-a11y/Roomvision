# RoomVision — fase 2

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

Fase 2 bevat pixelmaskers en onafhankelijke oppervlaktekleuren. Er is geen automatische herkenning, AI, offertefunctionaliteit of projectopslag.

## Voorbeeldfoto en licentie

Het testpanorama is **Jordan Pond**, door **Matthew Petroff**: een echte 4096 × 2048-equirectangulaire buitenfoto uit [Pannellum](https://github.com/mpetroff/pannellum/blob/99f4afd686e807d374a764231a58255f7dd853b6/examples/examplepano.jpg). De foto is ongewijzigd meegeleverd onder [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Bron, attributie en licentiemelding staan ook in `public/demo-panorama-CREDITS.txt` en `public/demo-panorama-LICENSE.txt`. De viewer zelf gebruikt Three.js; Pannellum is geen runtime-afhankelijkheid. Je kunt het testpanorama in de studio vervangen door je eigen interieurpanorama.

### Ontwikkelhost in de cloud

Next.js staat in ontwikkelmodus standaard `localhost` toe; dit project staat daarnaast `127.0.0.1` toe. Gebruik je een externe poortweergave of het LAN-adres van je computer, geef dan de exacte hostnaam (zonder schema, pad of poort) mee en herstart de server:

```bash
ROOMVISION_DEV_ORIGIN=jouw-ontwikkelhost.example npm run dev -- --hostname 0.0.0.0
```

Voor een telefoon via je LAN is dit bijvoorbeeld het IP-adres van je computer. In productiemodus (`npm run build` en `npm start`) is deze ontwikkelinstelling niet nodig.

## Fase 2 — de kleurstudio proberen

Open `/studio`. De studio start met de testkamer. De bestaande homepage, buitenfoto, eigen uploads en kijk-/zoombediening blijven beschikbaar.

1. Klik op de lege muur boven het kastje: **Muur 1** verschijnt in het kleurenpaneel. Deze muur loopt over de panoramanaad.
2. Kies **Rood**. Alleen de bijbehorende muurpixels kleuren; raam, schilderij, kastje en vloer blijven gelijk.
3. Klik op de muur rechts van de hoek (of draai eerst met slepen) en kies **Blauw** voor **Muur 2**. Muur 1 blijft rood.
4. Kijk rondom: de kleuren zitten op de boltextuur en blijven aan dezelfde oppervlakken gekoppeld.
5. Gebruik **Ongedaan maken** om de laatste kleur- of maskerbewerking terug te nemen. **Kleur herstellen** verwijdert alleen de kleur van het geselecteerde oppervlak.
6. Kies alternatieve kleuren uit het palet, de native kleurkiezer of geef een volledige `#RRGGBB`-waarde op en klik **Toepassen**.
7. Op mobiel: tik om te selecteren, veeg om te kijken en knijp om te zoomen. Het kleurenpaneel staat onder de viewer. Een veeg of knijpgebaar geldt niet als selectie. Met toetsenbord: pijltjes om te kijken, Enter selecteert in het midden; de dropdown biedt ook alle oppervlakken aan.

### Testkamer: reproduceerbaar en expliciet geen echte foto

Er was geen interieurfoto met betrouwbare oppervlaktemaskers beschikbaar. Daarom bevat `public/room/` een **synthetische, via raytracing gegenereerde testopstelling**. Het panorama is een echte 2048 × 1024-equirectangulaire weergave van een kamer met vier muren, plafond, deur, kozijn, plinten, venster, kastje, bank en tafel. Dit is een technische fixture, geen fotorealistisch interieur en geen herkenning van een gebruikersfoto.

Elke panoramapixel krijgt het ID van zijn eerste zichtbare oppervlak. De kamer, raamuitsparingen en meubelgeometrie zijn handmatig gedefinieerd in het script; panorama en masker delen dezelfde stralen. Er worden geen rechthoeken over het viewerbeeld gelegd. Meubels bedekken daadwerkelijk de achterliggende muur in het pixelmasker.

Regenereren zonder extra dependencies:

```bash
node scripts/generate-room.mjs
```

Dit schrijft deterministisch `panorama.png`, `surface-ids.png` en `fixture.json` naar `public/room/`. De gegenereerde fixture is eigen projectmateriaal. De oorspronkelijke buitenfoto behoudt de hierboven vermelde afzonderlijke CC BY-SA-licentie.

### Maskerformaat en eigen panorama's

Het masker is een **ondoorzichtige RGB-PNG**, met oppervlak-ID als exacte bytewaarde in het rode kanaal; groen en blauw zijn 0. Geen JPEG, antialiasing, transparantie of kleurenpalet-visualisatie als import gebruiken.

| Rode byte | Oppervlak-ID | Betekenis |
| --- | --- | --- |
| 0 | beschermd | Niet kleuren: meubels, ramen, vloer of nog ongemaskeerde pixels |
| 1–4 | wall_001 t/m wall_004 | Vier onafhankelijke muren |
| 5 | ceiling_001 | Plafond |
| 6 | door_001 | Deur |
| 7 | doorframe_001 | Deurkozijn |
| 8 | skirting_001 | Plinten (in de fixture als één groep) |

Een upload krijgt een **leeg** masker met dezelfde projectie, proportioneel verkleind tot maximaal 2048 pixels breed / 1024 hoog. De precieze vereiste maskermaten staan onder **Maskers corrigeren**. Een geïmporteerd masker moet exact deze maten hebben en uitgelijnd zijn met die specifieke foto. De app valideert maten en ID-encoding; ze kan niet automatisch controleren of de getekende grenzen inhoudelijk correct zijn. Testkamermaskers worden nooit stilzwijgend op een eigen foto toegepast.

Voor productiegebruik met echte interieurs zijn nog nodig: een scherp volledig equirectangulair interieurpanorama en nauwkeurig nagetekende/gesegmenteerde pixelmaskers voor die opname, inclusief uitsparingen voor meubels, ramen en deurdetails. Deze kunnen nu handmatig in de studio worden getekend of extern worden gemaakt en geïmporteerd. Losse fysieke delen die onafhankelijk moeten kleuren hebben een eigen catalogus-ID nodig; de huidige catalogus bevat de acht bovenstaande delen/groepen.

### Handmatig corrigeren

1. Kies het doeloppervlak bovenaan het paneel en open **Maskers corrigeren**.
2. Kies **Penseel** om pixels aan dat ID toe te wijzen, **Gum** om pixels op ID 0 te zetten. Kies een radius in maskerpixels. Slepen geeft een doorlopende streek. De borstel werkt ook over de links/rechts-naad; verticaal stopt hij bij de polen.
3. **Toon maskers** maakt de ID-gebieden zichtbaar; de selectie heeft een gouden rand. Zet dit uit om de kleurrendering te beoordelen.
4. Kies **Rondkijken** om weer te kunnen roteren. Eén streek is één undo-stap, inclusief meerdere pointermoves. Ook maskerimport en kleurherstel zijn ongedaan te maken (maximaal 20 stappen).
5. Met **Exporteer masker** download je een PNG-ID-masker; met **Importeer masker** laad je het terug. Een penseel kan bewust een beschermd pixelgebied overschrijven: controleer correcties met de maskervoorvertoning.

Alles blijft lokaal in de browsersessie. Herladen of een ander panorama openen wist kleuren en bewerkingsgeschiedenis. Maskerexport bevat uitsluitend IDs, geen panorama of gekozen kleuren. Er is nog geen compleet projectbestand of permanente opslag.

### Technische werking en grenzen

- `PanoramaViewer.tsx`: Three.js-raycasting vanaf muis/touch naar de bol. De positie wordt via `atan2` en `acos` naar panorama-UV omgezet. Bij een numerieke driehoeksnaad gebruikt dezelfde ray een analytische bolintersectie. U-coördinaten wrappen horizontaal; V wordt bij de polen begrensd.
- `lib/surfaces.ts`: CPU-ID-lookup, ID-catalogus, ronde/interpolerende pixelborstel en undo-snapshots. Geen screen-space-overlayselectie.
- `lib/color-material.ts`: WebGL-pigmentshader op de bestaande Three.js-bol. Een nearest-filtered, niet als sRGB behandelde ID-textuur bepaalt welke pixels kleuren. Elke ID heeft een eigen lineaire kleuruniform; panoramahelderheid bepaalt verlichting en detail. Selectieranden gebruiken dezelfde ID-textuur en wrappen op de naad.
- De shader bewaart variaties uit het oorspronkelijke beeld. Dit is geen fysisch gekalibreerde verfvoorspelling: vooral reflecties, overbelichte ramen, zeer donkere texturen en verzadigde originele muren vragen verdere kalibratie. Licht blijft vastgelegd vanuit de oorspronkelijke camera/opname.
- `ColorPanel.tsx`: palet, native kleurkiezer, HEX-validatie en herstel. `lib/mask-io.ts`: verliesloze PNG-import/-export.
- Geen nieuwe dependencies toegevoegd. Handmatige correcties veranderen de CPU-ID-map en dezelfde GPU-textuur, zodat selectie en kleur dezelfde grenzen gebruiken.

### Validatie van fase 2

`npm test` controleert UV/polen/naad, echte fixture-IDs en beschermde pixels, ronde penseelstreken over de naad, erase, onafhankelijke kleuren, undo en ongeldige ID-import. De Playwright-tests in `tests/e2e/colors.spec.ts` lezen **screenshots van de gerenderde WebGL-canvas**, niet alleen de React-state: rood op Muur 1, blauw op Muur 2, ongewijzigde meubel-/raampixels, 360° terugdraaien, herstellen, undo, maskerwissen, PNG-export/import en HEX-validatie. Mobiele tikselectie en bestaande pan/zoom/uploadcontroles draaien met Chromium-touch-emulatie. Fysieke iOS-/Android-apparaten zijn nog niet getest.

Voor Vercel: push de wijzigingen naar de gekoppelde GitHub-branch `main`; controleer dat de nieuwe deployment slaagt en open daarna `/studio`. Er zijn geen extra Vercel-variabelen of backendservices nodig.
