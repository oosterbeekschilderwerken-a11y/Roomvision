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

- [x] Lokale projectbestanden met foto, masker, kleuren en kleursterktes opslaan/terugopenen (geschiedenis blijft in de sessie).
- [ ] Export en vergelijking van kleurvarianten.
- [ ] Eventuele AI-oppervlakteherkenning.
- [ ] Eventueel offertesysteem.

## Vervolg fase 2 — gebruik en betrouwbaarheid

- [x] Complete lokale projectexport/import met formaatversie en validatie vóór het huidige ontwerp wordt vervangen.
- [x] Origineel/ingekleurd vergelijken op hetzelfde camerastandpunt.
- [x] Kleursterkte onafhankelijk per oppervlak.
- [x] Helderheidsreferentie per oppervlak in plaats van één vaste waarde voor alle muren.
- [x] Opnieuw uitvoeren naast ongedaan maken; nieuwe bewerkingen wissen de redo-tak.
- [x] Duidelijke melding en directe tekenactie voor nog ongemaskeerde oppervlakken op eigen foto’s.
- [x] Bestaande andere oppervlak-IDs standaard beschermen bij schilderen.
- [x] Unit- en browsertests voor projectbestanden, belichting, bescherming, vergelijking, sterkte en herstel.
- [ ] Een echte eigen interieurfoto met gecontroleerde maskers toevoegen zodra die beschikbaar is.

## RAL en verfmerken

- [x] Zoekbare, gepinde RAL Classic-catalogus met 215 schermindicaties en kleurgroepen.
- [x] Sikkens, Sigma en Flexa als gewenste merkvoorkeur per RAL-oppervlak.
- [x] Code en merkvoorkeur behouden bij undo/redo en complete projectexport/import.
- [x] Projectformaat versie 2; oude versie-1-projecten blijven leesbaar.
- [x] Eigen HEX-keuzes loshouden van gecatalogiseerde RAL-referenties.
- [x] Datasetlicentie, herkomst en schermbeperkingen documenteren en zichtbaar maken in de app.
- [x] Unit-tests en desktop-/mobiele browsercontroles voor de RAL-werkwijze.
- [ ] Geverifieerde eigen kleurcollecties en product-/mengbaarheidsgegevens van Sikkens, Sigma en Flexa verkrijgen en koppelen; huidige merkkeuze is uitsluitend een voorkeur.

## Gewone foto naast 360° — blijvende scope

- [x] Twee expliciete uploadopties; geen 2:1-eis voor gewone foto’s.
- [x] Vlakke weergave met aspectbehoud, passend in beeld, zoom en begrensde pan.
- [x] Dezelfde maskers, kleuren, RAL en merkvoorkeuren, undo/redo en projectopslag in beide modi.
- [x] Fotomaskers stoppen bij beeldranden; alleen panorama’s wrappen horizontaal.
- [x] Projectversie 3 bewaart het afbeeldingstype; versies 1 en 2 blijven compatibele panoramaprojecten.
- [x] De acht generieke standaardkleurvakjes verwijderd; RAL, eigen kleur en HEX behouden.
- [x] Productafspraken vastgelegd in AGENTS.md voor volgende wijzigingen.
- [x] Unit- en desktop-/mobiele browsercontroles voor beide modi.
