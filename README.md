# RoomVision — fase 2

Een Nederlandstalige kleurstudio voor **gewone foto’s én 360°-panorama’s**, met Next.js App Router, TypeScript, Tailwind CSS en Three.js. Gewone foto’s staan onvervormd op een vlak met zoom/pan; equirectangulaire panorama’s staan op de binnenkant van een 3D-bol. Beide gebruiken dezelfde pixelmaskers, kleurengine en projectopslag. Er is geen account, database of API-sleutel nodig.

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

- Kies **Gewone foto openen** voor een liggende, staande of vierkante foto. Minimaal 256 × 256 pixels; maximaal 8192 pixels per zijde, circa 33 megapixels en 25 MB. Geen 2:1-eis. De foto past volledig in het venster; na inzoomen kun je hem verschuiven.
- Kies **Open panoramafoto** voor een volledig 360°-panorama. Sleep met de muis of veeg met een vinger om rond te kijken.
- Scroll, knijp met twee vingers of gebruik +/− om te zoomen.
- Geef de viewer toetsenbordfocus en gebruik pijltjes, +/− en Home.
- De herstelknop zet kijkrichting en zoom terug.
- Open een eigen JPG-, PNG- of WebP-bestand. De foto wordt alleen lokaal in de browser gelezen, niet verstuurd of opgeslagen. Na herladen verschijnt het voorbeeld weer.
- Gebruik een volledig 360°-equirectangulair panorama met **2:1-verhouding** (1% afrondingstolerantie), minimaal 1024 × 512 en maximaal 8192 × 4096 pixels en 25 MB. Ook de maximale textuurgrootte van de GPU wordt gecontroleerd.
- Gewone foto’s en smalle telefoonpanorama’s zijn ongeschikt **als volledig 360°-panorama**; gebruik daarvoor de gewone-foto-optie. De app controleert formaat, bestandsgrootte, leesbaarheid, resolutie en verhouding. De equirectangulaire projectie is niet automatisch uit beeldinhoud vast te stellen: een gewone foto die tot 2:1 is bijgesneden kan de controles passeren maar wordt vervormd weergegeven.
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

De studio bevat pixelmaskers, onafhankelijke oppervlaktekleuren, lokale klikselectie en een omtrekgereedschap. Er is geen semantische AI-herkenning, offertefunctionaliteit of serveropslag. Projecten kun je lokaal downloaden en terugopenen.

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
5. Gebruik **Ongedaan maken** om de laatste kleur- of maskerbewerking terug te nemen; **Opnieuw uitvoeren** zet deze terug zolang je nog geen nieuwe bewerking hebt gedaan. **Kleur herstellen** verwijdert alleen de kleur van het geselecteerde oppervlak.
6. Kies alternatieve kleuren uit de RAL-catalogus, de native kleurkiezer of geef een volledige `#RRGGBB`-waarde op en klik **Toepassen**.
7. Op mobiel: tik om te selecteren, veeg om te kijken en knijp om te zoomen. Het kleurenpaneel staat onder de viewer. Een veeg of knijpgebaar geldt niet als selectie. Met toetsenbord: pijltjes om te kijken, Enter selecteert in het midden; de dropdown biedt ook alle oppervlakken aan.

### Testkamer: reproduceerbaar en expliciet geen echte foto

Er was geen interieurfoto met betrouwbare oppervlaktemaskers beschikbaar. Daarom bevat `public/room/` een **synthetische, via raytracing gegenereerde testopstelling**. Het panorama is een echte 2048 × 1024-equirectangulaire weergave van een kamer met vier muren, plafond, deur, kozijn, plinten, venster, kastje, bank en tafel. Dit is een technische fixture, geen fotorealistisch interieur en geen herkenning van een gebruikersfoto.

Elke panoramapixel krijgt het ID van zijn eerste zichtbare oppervlak. De kamer, raamuitsparingen en meubelgeometrie zijn handmatig gedefinieerd in het script; panorama en masker delen dezelfde stralen. Er worden geen rechthoeken over het viewerbeeld gelegd. Meubels bedekken daadwerkelijk de achterliggende muur in het pixelmasker.

Regenereren zonder extra dependencies:

```bash
node scripts/generate-room.mjs
```

Dit schrijft deterministisch `panorama.png`, `surface-ids.png` en `fixture.json` naar `public/room/`. De gegenereerde fixture is eigen projectmateriaal. De oorspronkelijke buitenfoto behoudt de hierboven vermelde afzonderlijke CC BY-SA-licentie.

### Maskerformaat en eigen afbeeldingen

Het masker is een **ondoorzichtige RGB-PNG**, met oppervlak-ID als exacte bytewaarde in het rode kanaal; groen en blauw zijn 0. Geen JPEG, antialiasing, transparantie of kleurenpalet-visualisatie als import gebruiken.

| Rode byte | Oppervlak-ID | Betekenis |
| --- | --- | --- |
| 0 | beschermd | Niet kleuren: meubels, ramen, vloer of nog ongemaskeerde pixels |
| 1–4 | wall_001 t/m wall_004 | Vier onafhankelijke muren |
| 5 | ceiling_001 | Plafond |
| 6 | door_001 | Deur |
| 7 | doorframe_001 | Deurkozijn |
| 8 | skirting_001 | Plinten (in de fixture als één groep) |

Een upload krijgt aanvankelijk een **leeg** masker met dezelfde projectie. Je kunt dat nu direct aanmaken door op een muur te klikken of de omtrek te tekenen; een extern masker is niet verplicht. Bij panorama’s is dat proportioneel verkleind tot maximaal 2048 × 1024 pixels. Bij gewone foto’s zijn beide zijden maximaal 2048 pixels en is het totaal begrensd op 2.097.152 pixels; portretfoto’s behouden hun staande verhouding. De precieze vereiste maskermaten staan onder **Maskers corrigeren**. Een geïmporteerd masker moet exact deze maten hebben en uitgelijnd zijn met die specifieke foto. De app valideert maten en ID-encoding; ze kan niet automatisch controleren of de getekende grenzen inhoudelijk correct zijn. Testkamermaskers worden nooit stilzwijgend op een eigen foto toegepast.

Voor productiegebruik met echte interieurs zijn nog nodig: een scherpe gewone interieurfoto of een volledig equirectangulair interieurpanorama, plus nauwkeurig nagetekende/gesegmenteerde pixelmaskers voor die opname, inclusief uitsparingen voor meubels, ramen en deurdetails. Deze kunnen nu handmatig in de studio worden getekend of extern worden gemaakt en geïmporteerd. Losse fysieke delen die onafhankelijk moeten kleuren hebben een eigen catalogus-ID nodig; de huidige catalogus bevat de acht bovenstaande delen/groepen. Vooraf getekende maskers zijn niet verplicht: de nieuwe klikselectie en Muur tekenen werken ook op eigen uploads.

### Handmatig corrigeren

1. Kies het doeloppervlak bovenaan het paneel en open **Maskers corrigeren**.
2. Kies **Penseel** om pixels aan dat ID toe te wijzen, **Gum** om pixels op ID 0 te zetten. Kies een radius in maskerpixels. Slepen geeft een doorlopende streek. Bij panorama’s werkt de borstel ook over de links/rechts-naad; verticaal stopt hij bij de polen. Bij gewone foto’s stopt de borstel aan alle beeldranden en loopt een streek nooit via de andere kant verder.
3. **Toon maskers** maakt de ID-gebieden zichtbaar; de selectie heeft een gouden rand. Zet dit uit om de kleurrendering te beoordelen.
4. Kies **Rondkijken** om weer te kunnen roteren. Eén streek is één undo-stap, inclusief meerdere pointermoves. Ook maskerimport en kleurherstel zijn ongedaan te maken (maximaal 20 stappen).
5. Met **Exporteer masker** download je een PNG-ID-masker; met **Importeer masker** laad je het terug. Met **Andere oppervlakmaskers beschermen** (standaard aan) blijft een bestaand ander oppervlak-ID intact tijdens schilderen. ID 0 kan wel worden beschilderd; dit is nodig voor eigen foto’s met een leeg masker. De app kan daarbij nog niet onderscheiden of een ID-0-pixel een raam, meubel of ongemaskeerde muur is. Controleer dit met de maskervoorvertoning. De gum blijft pixels naar ID 0 terugzetten.

Alles blijft lokaal. Gebruik **Project opslaan** vóór herladen of wisselen van afbeelding: het `.roomvision`-bestand bevat de foto, exacte ID-maskers, alle kleuren en kleursterktes. Met **Project openen** herstel je deze combinatie, ook na herladen. Undo/redo-geschiedenis en de kijkrichting worden niet opgeslagen. Er is geen automatische opslag: zonder gedownload project gaan wijzigingen bij herladen verloren. Losse maskerexport bevat nog steeds uitsluitend IDs, geen panorama of kleuren.

### Technische werking en grenzen

- `PanoramaViewer.tsx`: gedeelde Three.js-viewer. Bij gewone foto’s gebruikt hij een vlak met orthografische camera, aspectbehoud, passend in beeld, zoom tot 500%, begrensde pan en raycasting naar foto-UV. Bij panorama’s gebruikt hij raycasting vanaf muis/touch naar de bol. De positie wordt via `atan2` en `acos` naar panorama-UV omgezet. Bij een numerieke driehoeksnaad gebruikt dezelfde ray een analytische bolintersectie. U-coördinaten wrappen horizontaal; V wordt bij de polen begrensd.
- `lib/surfaces.ts`: CPU-ID-lookup, ID-catalogus, ronde/interpolerende pixelborstel en undo-snapshots. Geen screen-space-overlayselectie.
- `lib/color-material.ts`: WebGL-pigmentshader op de bestaande Three.js-bol. Een nearest-filtered, niet als sRGB behandelde ID-textuur bepaalt welke pixels kleuren. Elke ID heeft een eigen lineaire kleuruniform; panoramahelderheid bepaalt verlichting en detail. De shader normaliseert nu per oppervlak met het 75e percentiel van de lineaire beeldhelderheid (berekend uit een verkleinde foto en dat oppervlakmasker). Hierdoor bepaalt een andere, lichtere muur niet de basis van een donkere muur. Selectieranden gebruiken dezelfde ID-textuur: horizontaal herhalen bij panorama’s, clamp aan de randen bij gewone foto’s.
- De shader bewaart variaties uit het oorspronkelijke beeld. Dit is geen fysisch gekalibreerde verfvoorspelling: vooral reflecties, overbelichte ramen, zeer donkere texturen en verzadigde originele muren vragen verdere kalibratie. Licht blijft vastgelegd vanuit de oorspronkelijke camera/opname.
- `ColorPanel.tsx`: RAL-catalogus, native kleurkiezer, HEX-validatie en herstel. `lib/mask-io.ts`: verliesloze PNG-import/-export.
- Geen nieuwe dependencies toegevoegd. Handmatige correcties veranderen de CPU-ID-map en dezelfde GPU-textuur, zodat selectie en kleur dezelfde grenzen gebruiken.

### Validatie van fase 2

`npm test` controleert UV/polen/naad, echte fixture-IDs en beschermde pixels, ronde penseelstreken over de naad, erase, onafhankelijke kleuren, undo en ongeldige ID-import. De Playwright-tests in `tests/e2e/colors.spec.ts` lezen **screenshots van de gerenderde WebGL-canvas**, niet alleen de React-state: rood op Muur 1, blauw op Muur 2, ongewijzigde meubel-/raampixels, 360° terugdraaien, herstellen, undo, maskerwissen, PNG-export/import en HEX-validatie. Mobiele tikselectie en bestaande pan/zoom/uploadcontroles draaien met Chromium-touch-emulatie. Fysieke iOS-/Android-apparaten zijn nog niet getest.

Voor Vercel: push de wijzigingen naar de gekoppelde GitHub-branch `main`; controleer dat de nieuwe deployment slaagt en open daarna `/studio`. Er zijn geen extra Vercel-variabelen of backendservices nodig.


## Vervolg fase 2 — ontwerpen bewaren en beter beoordelen

- **Project opslaan / openen:** één lokaal `.roomvision`-bestand, versie 4 (versies 1, 2 en 3 blijven leesbaar). Foto, pixelmasker, kleuren en kleursterktes blijven samen. Geen account, serverupload of automatische cloudopslag. Limiet: 45 MB per projectbestand; de bestaande foto- en resolutielimieten blijven gelden. De import controleert bestandsformaat, foto, maskermaten/IDs, kleuren en sterktes voordat het huidige ontwerp wordt vervangen. Een ongeldige import laat het huidige ontwerp intact.
- **Toon origineel / Toon kleuren:** vergelijkt hetzelfde camerastandpunt zonder kleuren, selectietint of masker-overlay. Een nieuwe kleur kiezen schakelt terug naar de ingekleurde weergave.
- **Kleursterkte per oppervlak:** 0% is de originele foto, 100% het berekende pigment; tussenwaarden mengen beide in lineaire kleurruimte. Andere muren behouden hun eigen instellingen. Het blijft een visuele verfbenadering, geen gekalibreerde voorspelling van materiaal of daglicht.
- **Ongedaan maken / Opnieuw uitvoeren:** kleuren, kleursterktes en maskers delen een geschiedenis van maximaal 20 stappen. Een nieuwe bewerking na undo wist de redo-tak. De geschiedenis blijft alleen in de actieve sessie.
- **Eigen foto’s:** een leeg oppervlak meldt nu “nog geen masker”. **Begin masker tekenen** opent de correcties, activeert de borstel en toont de maskers. Er wordt geen automatische herkenning gesuggereerd. Andere bestaande oppervlak-IDs zijn standaard beschermd tegen overschilderen.

Nieuwe bronbestanden: `lib/project.ts` (projectformaat, validatie en lokaal downloaden), `lib/lighting.ts` (referentiehelderheid per oppervlak), `tests/projects.test.ts` en `tests/e2e/workflow.spec.ts`. Browsercontroles vergelijken echte gerenderde pixels bij origineel/ingekleurd, 0%-kleursterkte, undo/redo en het terugopenen van een compleet project na herladen.

Een echte eigen woonkamerfoto met correcte maskers is nog niet meegeleverd. Lever daarvoor een gewone interieurfoto of een volledig 2:1-interieurpanorama aan; de studio ondersteunt handmatig tekenen of importeren van bijpassende maskers. De synthetische testkamer blijft beschikbaar en is als zodanig gemarkeerd.


## RAL-kiezer en gewenste verfmerken

Selecteer een muur en open **RAL-kleuren & verfmerk**. De kiezer bevat 215 gepinde RAL Classic-schermindicaties. Zoek op bijvoorbeeld `RAL 9010`, `9010`, `zuiver wit`, `crèmewit` of een oorspronkelijke Engelse bronnaam. Filter desgewenst op kleurgroep. Kies Sikkens, Sigma of Flexa als **gewenst verfmerk** en klik op een kleurkaart. De shader past de schermkleur uitsluitend op het geselecteerde oppervlak toe.

RAL is een merkonafhankelijk systeem. Sikkens, Sigma en Flexa zijn hier merkvoorkeuren, geen afzonderlijke eigen merkcollecties en geen bevestiging dat een specifiek product in die RAL-kleur mengbaar of leverbaar is. De officiële merksites waren vanuit de ontwikkelomgeving niet bereikbaar (proxy-403); eigen fabrikantpaletten, spectrale data en mengrecepten zijn daarom niet geïmporteerd. Hiervoor zijn geverifieerde fabrikantgegevens nodig.

Bron: `ral-colors@1.0.1` onder MIT; de gepinde gegevens staan in `data/ral-classic.json`, bronverantwoording in `data/README.md` en de licentie in `licenses/ral-colors-MIT.txt`. Veelgebruikte Nederlandse namen zijn toegevoegd naast de oorspronkelijke namen. Waar bron-RGB en bron-HEX verschillen gebruikt de app consequent bron-HEX. Deze waarden zijn **niet-officiële schermbenaderingen**, geen gekalibreerde of gegarandeerd volledige actuele RAL-catalogus. Metallic-, parel- en fluorescente effecten worden niet nagebootst. Gebruik fysieke kleurstalen voor een definitieve verfkeuze. De pagina `/color-sources` licht dit ook in de app toe. Er is geen nieuwe runtime-dependency of externe kleur-API nodig.

Per oppervlak worden zowel de HEX-schermkleur als `{ system: "RAL Classic", code: "9010", brand: "Sikkens" }` bewaard. Merkvoorkeur is ook `null` mogelijk. Kleursterkte, maskerbewerkingen en undo/redo behouden die referentie. Projectformaat **versie 4** bewaart deze metadata, kleurvarianten en het afbeeldingstype; versie 2 met RAL-metadata blijft leesbaar en oude versie-1-projecten openen met eigen HEX-kleuren zonder achteraf een RAL-code te raden. HEX-invoer of een eigen kleur uit de kleurkiezer wist de RAL-referentie van dat oppervlak, ook wanneer de HEX toevallig hetzelfde is. Bij projectimport moeten code, toegestane merkvoorkeur en opgeslagen HEX overeenkomen met de gepinde dataset.

Nieuwe controles: unieke codes en geldige HEX-waarden, accentongevoelig zoeken, ongeldige referenties, versie-1-compatibiliteit, metadata bij undo/redo en projectimport. Desktop- en mobiele browsertests controleren RAL 9010 met Sikkens op één muur, RAL 7016 met Sigma/Flexa op een andere, herstel na herladen, eigen HEX zonder misleidende RAL-aanduiding en de bronvermelding. Pixelcontroles gebruiken screenshots en, bij vergelijking van identieke weergaves na scrollen, de echte WebGL-framebuffer om CSS-resampling uit te sluiten.


## Gewone foto en 360° als blijvende productkeuze

- **Gewone foto openen:** vlak beeld met originele verhoudingen, zoomen en verschuiven via muis, touch en toetsenbord. De gehele foto past bij 100%; de herstelknop zet zoom en verschuiving terug. Klikken op lege ruimte naast de foto selecteert geen muur.
- **Open panoramafoto:** bestaande volledige 360°-weergave met de strikte 2:1-controle en horizontale naad.
- Er wordt nooit op basis van de beeldverhouding geraden of een afbeelding een panorama is: de gekozen uploadknop bepaalt de modus. Zelfs een 2:1-foto kan dus als vlakke foto worden geopend.
- Beide modi delen RAL/merkvoorkeuren, eigen kleur en HEX, kleursterkte, origineelvergelijking, ronde maskerpenselen, gum, undo/redo en maskerimport/-export. Eigen afbeeldingen beginnen zonder vooraf gemaakte maskers. Direct klikken maakt nu een lokaal kleurgebied aan; Muur tekenen biedt een nauwkeurige handmatige omtrek. Maskerimport blijft optioneel. Dit is geen semantische AI-muurherkenning.
- Projectversie 4 bewaart `projection: "photo" | "panorama"` en kleurvarianten. Versie 3 blijft zijn afbeeldingstype behouden; versies 1 en 2 openen als panorama, passend bij hun oorspronkelijke gedrag. Nieuwe fotoprojecten herstellen hun vlakke weergave en maskers zonder naadwrapping.
- De acht generieke standaardkleurvakjes zijn op gebruikersverzoek verwijderd. De RAL-catalogus, native kleurkiezer en HEX-invoer blijven bestaan.
- Deze afspraken staan ook in `AGENTS.md`: toekomstige wijzigingen moeten beide invoertypes ondersteunen en testen.

`lib/image-kind.ts` bevat de gedeelde modusdefinitie en maskermaatberekening. `tests/image-kind.test.ts` controleert gewone beeldverhoudingen, geheugenlimieten, fotomaskerranden en compatibele projectbestanden. `tests/e2e/photo.spec.ts` gebruikt expliciet synthetische 2D-testbeelden om vlakke selectie, onafhankelijke muurkleuren, meubelbescherming, RAL, vergelijking, foto-opslag/herstel, zoom/pan, terugschakelen naar 360°, staande mobiele foto’s, penseel, undo en knijpzoom te controleren.


## Huisstijl van de website

De interfacekleuren zijn visueel afgestemd op de aangeleverde screenshot van oosterbeekschilderwerken.com. Op verzoek is het krachtige blauw iets donkerder uitgevoerd:

- Accent en primaire knoppen: `#103F86`; hover: `#0B3069`.
- Donkerblauwe tekst en vieweromlijsting: `#142235`.
- Lichte blauwgrijze pagina: `#F5F7FB`; witte panelen: `#FFFFFF`.
- Zachte accenten: `#DCE7F8`; ondersteunende panelen: `#EDF3FC`.

De bronwebsite was vanuit deze omgeving niet bereikbaar; dit is dus een benadering van de screenshot, geen uitgelezen officieel huisstijlbestand. De tokens in `app/globals.css` sturen homepage, studio, formulieren, focus/hover, panelen en catalogusomlijsting. Ook favicon en mobiele browserkleur volgen de huisstijl. De kleuren in RAL-data, eigen foto's, muurverf en opgeslagen projecten worden hierdoor niet aangepast. Beide beeldmodi blijven dezelfde bediening gebruiken.


## Eigen uploads daadwerkelijk selecteren en kleuren

De oude eigen-uploadroute maakte alleen een lege ID-map aan: daardoor selecteerde een klik niets totdat de gebruiker verborgen maskercorrecties gebruikte. Dat is vervangen door een directe workflow:

1. Open een **Gewone foto** of een **360°-panorama**. Klikselectie staat meteen aan.
2. Klik/tik in een muur. De app kiest een aaneengesloten gebied met vergelijkbare oorspronkelijke beeldkleuren, kent een vrij muur-ID toe en opent de selectie. Met **Kleur kiezen voor Muur …** spring je naar het kleurenpaneel.
3. Kies RAL, eigen kleur of HEX. Klik daarna op een volgende nog ongemaskeerde muur om die onafhankelijk te kleuren. Vier muur-ID’s zijn beschikbaar; voor plafonds/deuren/details blijft de expliciete oppervlakselectie beschikbaar.
4. Met **Toevoegen aan gekozen muur** kun je een extra schaduwgebied aan dezelfde muur toevoegen. De slider **Kleurverschil toestaan** bepaalt de gevoeligheid voor je volgende klik. Bestaande andere oppervlak-ID’s worden beschermd.
5. Controleer de grenzen. De klikselectie gebruikt lokale RGB-kleurafstand en aaneengesloten pixels, **geen semantisch AI-model**. Gelijkgekleurde aangrenzende muren of meubels kunnen samen geselecteerd worden; schaduwen kunnen juist aparte gebieden geven. Een selectie boven 72% van de hele afbeelding wordt geweigerd en verandert het masker niet. Dit voorkomt een onbedoelde vlakvulling, maar is geen garantie van semantisch correcte muurgrenzen.

### Betrouwbare handmatige omtrek

Gebruik bij lastige muren **Muur tekenen**. Klik 3 tot 64 hoeken rondom het gewenste oppervlak; de lijnen en hoekpunten staan in de echte viewer en blijven met de foto meebewegen. Sleep desgewenst om rond te kijken of te verschuiven. Klik **Muur vastleggen** in het beeld. Hiermee wordt een echt pixelmasker gevuld, geen rechthoekige schermoverlay. Het resultaat kun je meteen kleuren. **Punt terug** verwijdert een hoek; **Annuleren** verwerpt alleen de nog niet vastgelegde omtrek.

Bij gewone foto’s stopt de omtrek aan de beeldrand. Bij panorama’s worden de U-coördinaten op de 360°-naad doorgetrokken. Een omtrek is een veelhoek in panoramacoördinaten; voeg bij gebogen of schuine grenzen extra hoekpunten toe. Ramen en meubels binnen de getekende omtrek zijn niet automatisch uitgesneden: gebruik **Gum / corrigeren**, of teken de grens met uitsparingen. De bestaande penseel-, gum- en PNG-maskerfuncties blijven beschikbaar. Geïmporteerde maskers en heropende projecten met bestaande gebieden starten in gewone selectiemodus, zodat beschermde ID-0-pixels niet meteen opnieuw worden ingekleurd.

## Fase 3 — kleurvarianten en PNG-export

Onder **Jouw kleurvarianten** kun je maximaal acht benoemde ontwerpen bewaren, inclusief eigen kleuren, kleursterktes en RAL-/merkvoorkeuren. **Toon [naam]** past de kleuren toe zonder camera, zoom of maskergrenzen te veranderen, zodat je ontwerpen op hetzelfde beeld vergelijkt. Varianten delen dezelfde actuele muurmaskers; ze bevatten geen afzonderlijke foto’s of selecties. Het verwijderen van een variant verwijdert niet de huidige kleuren. Variantbewerkingen vallen onder undo/redo. De historie zelf blijft in de browsersessie.

**Weergave downloaden (PNG)** exporteert de echte WebGL-render, zonder HTML-bediening, maskervoorvertoning, selectiecontouren of onvoltooide tekenlijnen. Een gewone foto wordt geëxporteerd zoals zichtbaar in het venster, inclusief eventuele zoom/uitsnede en vrije omlijsting. Een panorama levert de huidige kijkrichting op als normale PNG, niet een volledig herberekend equirectangulair bestand. De resolutie volgt het huidige canvas, met apparaatpixelratio begrensd op 2. De knop **Toon origineel** wordt gerespecteerd: als je het origineel bekijkt, exporteer je dat beeld.

Gebruik **Project opslaan** voor bewerkbaar hergebruik: versie 4 bevat foto, projectie, pixelmaskers, actieve kleuren en maximaal acht gevalideerde varianten. Versies 1 t/m 3 blijven leesbaar en starten zonder varianten. Gegevens blijven lokaal; er is geen upload naar een herkenningsdienst of externe exportserver.

Nieuwe implementatie: `lib/selection.ts` (kleurbereik, UV-veelhoeken en beeldinvoer), `lib/variants.ts`, `components/VariantPanel.tsx`, en gedeelde viewer-pick/preview/exportfuncties. De selectie- en fase-3-browsertests gebruiken uploads **zonder vooraf gemaakte maskers**. Ze controleren onafhankelijke rode/blauwe muren, beschermde contrasterende meubel-/raampixels, precieze omtrekken op gewone foto’s en over de 360°-naad, mobiele tikselectie, undo, varianten, projectherstel en de werkelijk gedownloade PNG-pixels voor beide modi. Testbeelden zijn synthetisch; een praktijkcontrole op de specifieke foto van de gebruiker en op fysieke telefoons blijft nodig.
