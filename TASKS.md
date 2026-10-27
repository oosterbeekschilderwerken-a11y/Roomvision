# RoomVision — ontwikkelplanning

## Fase 1 — 360° basis (afgerond)

- [x] Next.js App Router, TypeScript, Tailwind CSS en Three.js.
- [x] Nederlandstalige responsive homepage en echte 360°-viewer.
- [x] Muis, touch, zoom, toetsenbord en lokale panorama-upload met validatie.
- [x] Productiebuild, lint, typecheck en regressietests.

## Fase 2 — onafhankelijke oppervlaktekleuren

- [x] Reproduceerbare equirectangulaire testkamer met pixel-ID-masker; expliciet als synthetische fixture gemarkeerd.
- [x] Vier onafhankelijke muren, plafond, deur, deurkozijn en plintgroep.
- [x] ID 0 beschermt meubels, ramen en vloer; eerste zichtbare geometrie bepaalt elk maskerpixel.
- [x] Three.js-raycasting, UV-conversie, ID-lookup, naadwrapping en selectiecontour.
- [x] Klik/tik voor selectie, slepen/knijpen zonder onbedoelde selectie en toetsenbordalternatief.
- [x] Palet, native kleurkiezer, HEX-validatie en kleurherstel per oppervlak.
- [x] WebGL-kleurshader met behoud van panoramahelderheid, schaduw en textuurvariatie.
- [x] Ongedaan maken voor kleuren, kleurherstel, maskerimport en volledige penseelstreken.
- [x] Ronde pixelborstel, gum, ID-voorvertoning en PNG-maskerimport/-export.
- [x] Eigen panorama's krijgen lege maskers; nooit onjuiste demo-maskers overdragen.
- [x] Tests voor onafhankelijke rode/blauwe muren, beschermde meubel-/raampixels, volledige rotatie, mobiele selectie en undo.
- [x] Documentatie voor fixture, ID-formaat, correcties en beperkingen.

## Nog nodig voor echte interieurfoto's

- [ ] Geschikt interieurpanorama plus nauwkeurig uitgelijnde oppervlakte-ID-maskers aanleveren of handmatig tekenen.
- [ ] Meer onafhankelijke ID's wanneer bijvoorbeeld elke losse plint of deur een eigen kleur nodig heeft.
- [ ] Verfweergave kalibreren op echte materialen, extreme belichting en sterk gekleurde originele muren.
- [ ] Fysieke iOS-/Android-apparaten en andere GPU's testen.

## Latere fases — na aparte opdracht

- [ ] Volledige projecten met foto, masker, kleuren en geschiedenis opslaan/terugopenen.
- [ ] Export en vergelijking van kleurvarianten.
- [ ] Eventuele AI-oppervlakteherkenning.
- [ ] Eventueel offertesysteem.
