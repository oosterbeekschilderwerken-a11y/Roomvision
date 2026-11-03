import Header from "@/components/Header";
import { RAL_COLORS } from "@/lib/paint-catalog";
export default function ColorSources() {
  return (
    <>
      <Header studio />
      <main className="color-sources">
        <p className="eyebrow">VERANTWOORDE KLEURKEUZE</p>
        <h1>Kleurbronnen en verfmerken</h1>
        <h2>RAL Classic</h2>
        <p>
          RoomVision bevat {RAL_COLORS.length} RAL Classic-schermindicaties uit
          de openbare dataset{" "}
          <a href="https://github.com/ieskudero/ral-colors">ral-colors 1.0.1</a>{" "}
          (MIT). Codes en HEX-waarden komen uit die bron. Veelgebruikte
          Nederlandse namen zijn toegevoegd; overige namen volgen de bron. Dit
          is geen officiële, gekalibreerde of gegarandeerd actuele volledige
          RAL-catalogus.
        </p>
        <p>
          Een beeldscherm, belichting, verfglans en ondergrond beïnvloeden de
          waarneming. De studio simuleert geen metallic-, parel- of fluorescente
          effecten. Kies definitieve verf aan de hand van een fysieke kleurstaal
          en proefvlak.
        </p>
        <h2>Sikkens, Sigma en Flexa</h2>
        <p>
          Deze namen leggen je gewenste verfmerk vast bij een RAL-keuze. RAL is
          een afzonderlijk, merkonafhankelijk kleursysteem. Een merkvoorkeur
          bevestigt niet dat een specifiek verfproduct in die kleur verkrijgbaar
          of mengbaar is. Controleer dit bij de fabrikant of verfwinkel.
        </p>
        <p>
          Eigen merkcollecties, productassortimenten en mengrecepten zijn nog
          niet gekoppeld. Daarvoor zijn geverifieerde fabrikantgegevens nodig;
          RoomVision stelt merkkleuren niet op basis van een vergelijkbare
          HEX-code aan elkaar gelijk.
        </p>
        <p>
          <a href="/licenses/ral-colors-MIT.txt">
            Licentietekst van de dataset
          </a>{" "}
          · <a href="/studio">Terug naar de studio</a>
        </p>
      </main>
    </>
  );
}
