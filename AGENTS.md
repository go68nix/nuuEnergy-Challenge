# AGENTS.md

Context for coding agents working in this repository.

## Reference: nuuEnergy Wärmepumpen-Check

The challenge company's own online heat pump check. Checked on 2026-10-24; the form was last published on
2026-10-15. Re-check before relying on details.

### Where it lives

- Embedded on https://www.nuuenergy.com/ (anchor `#wp-check`, button "Wärmepumpen-Eignung prüfen") and on
  https://www.nuuenergy.com/waermepumpe-check.
- Built with the Heyflow form builder: `<heyflow-wrapper flow-id="hp-check">`. The flow is served at
  https://mini-serve.prd.heyflow.com/hp-check.
- To re-check: fetch that URL and read the `<section name="...">` screens. Answers are in `data-answer`,
  slider ranges in `data-options`. Do not submit the form: it creates a real lead in nuuEnergy's CRM.

### It shows no estimate

- The intro promises which heating system fits, how much heating cost the customer saves and how much subsidy
  applies. The form itself computes none of it.
- It is a lead form. The last question's button reads "Ergebnis erhalten" (get result) and opens a contact
  screen: "Unser System hat Ihre Angaben geprüft. Wir haben noch eine Rückfrage. Diese würden wir gerne
  telefonisch klären." The thank-you screen says the experts will call.
- The flow has no calculation blocks (only text, input, choice, slider, select, checkbox, progress and button
  blocks), and its custom-code file reads `// Custom code omitted`.
- Hidden fields carry ad tracking (`gclid`, `utm_*`, `hsa_cam`) and a HubSpot owner ID, so leads most likely
  go to HubSpot (inference).
- The homepage describes the process after the form:
  1. Online check.
  2. Phone call with an employee of the technical planning office, about 30 minutes.
  3. On-site visit: a master installer does the heat load calculation (about 2 hours) and checks feasibility.
  4. System design and offer.
  5. nuuEnergy applies for the subsidy.
  6. Installation, usually 5 working days.

So nuuEnergy staff make the first assessment after the customer submits the form. This app can show one on
screen right away.

### Questions, in order

| # | Screen | Question | Answers / input | Field |
|---|---|---|---|---|
| 1 | `haus-heizung` | Wie werden Ihre Räume beheizt? | Heizkörper · Fussbodenheizung · Fussbodenheizung und Heizkörper | `heizung_desk` |
| 2 | `haus-typ` | Für welchen Gebäudetyp benötigen Sie eine neue Heizung? | Ein- oder Zweifamilienhaus · Mehrfamilienhaus · Reihenendhaus · Reihenhaus - Mitte · Doppelhaushälfte | `haus_typ_desk` |
| 3 | `heating-old` | Wie heizen Sie aktuell Ihr Gebäude? | Gasheizung · Ölheizung · Pellet · Brennwert-Gasheizung · Brennwert-Ölheizung · Fernwärme oder Anderes; the answer picks screen 4 | `heating-old` |
| 4 | `heating-gas`, `-oil`, `-pellet`, `-anderes` | Wie hoch ist Ihr durchschnittlicher Gas- / Öl- / Pellet- / Wärme-Jahresverbrauch? | Slider, step 100: gas 0–50,000 kWh (start 5,000); oil 0–8,000 L (start 2,400); pellet 0–5,000 kg (start 2,500); district heating or other 0–35,000 kWh (start 2,000) | `gas_kw`, `oil_liter`, `pellet_kg`, `warm_kwh` |
| 5 | `haus-jahr` | In welchem Jahr wurde das Gebäude erbaut? Fassade / Dach nachträglich gedämmt? | Year: number field, placeholder "z.B. 1990". Facade and roof: Ja · Nein / Unbekannt | `baujahr`, `fassaden_desk`, `dach_desk` |
| 6 | `haus-size` | Wie groß ist die zu beheizende Wohnfläche (m²)? | Slider 0–500 m², step 1, start 80 | `beheizte_flache` |
| 7 | `heating-alter` | Wie viele Jahre ist Ihre Heizung schon in Betrieb? | 0-9 · 10-19 · 20-29 · 30+ Jahre · Unbekannt | `alter` |
| 8 | `wann` | Wann soll Ihre neue Heizung installiert werden? | Sofort · In 1 bis 3 Monaten · In 3 bis 6 Monaten · In mehr als 6 Monaten · Heizungswechsel derzeit nicht geplant | `wann` |
| 9 | `kontakt-informationen` | Erhalten Sie Ihre persönliche Ersteinschätzung | First name, last name, ZIP, e-mail, phone, consent, "Wie haben Sie uns gefunden?" | `vorname1`, `nachname`, `zip`, `e-mail`, `phone` |
| 10 | `danke` | Thank-you screen | | |

Why the form asks (from its hint texts):

- Building type: it "beeinflusst die Berechnung Ihres Wärmebedarfs maßgeblich"; detached houses can need more
  heat than terraced ones.
- Current heating: to plan space needs and building work for the fuel change.
- Consumption: "Um eine grobe Abschätzung der benötigten Heizlast vornehmen zu können".
- Heating age: to check subsidy eligibility.
- ZIP: local subsidies and local conditions.

Not asked: occupants, income, flow temperature, single- or two-pipe system.

### Numbers nuuEnergy publishes

From nuuEnergy's own pages; not checked against KfW or other primary sources.

- Heat pump sizes: 5, 7, 10, 12, 16 or 20 kW.
- Installed price before subsidy: about €29,000–34,000 for a small single-family house (7 kW); about
  €35,000–45,000 for 10 kW+ or complex projects.
- Heating costs usually drop by 30–50 %; payback 7–10 years, also in old buildings.
- Suitability: single-pipe systems ("Einrohrsysteme") are mostly not suitable; insulation and heating surfaces
  are checked. If a house is not ideal, they size the heat pump smaller and bridge peaks with an electric heater
  rod, or renovate in stages.
- Subsidy (KfW 458) per https://www.nuuenergy.com/foerderung-waermepumpe:
  - 30 % base for owner-occupiers, any income; tied to EU manufacturing from 2027.
  - 16 % climate speed bonus for replacing an oil or gas heating that is at least 20 years old. It drops by
    4 points every 6 months from February 2027 and reaches 0 % in August 2028.
  - Income bonus by taxable household income: up to €30,000: 40 %; €30,001–40,000: 30 %; €40,001–50,000:
    10 %; above: none. A minor child in the household lowers the income used by €10,000.
  - At most 70 %; 80 % for the lowest income band with a child. The page does not say how the parts combine
    (30 % + 16 % is 46 %).
  - Eligible costs: at most €28,000 per dwelling, €750 less every 6 months from February 2027.
  - The efficiency bonus and the emission-reduction surcharge ended on 21 July 2026.
  - Munich (FKG): up to +15 %, topping federal funding up to 60 % at most; apply before placing the order.
    Hamburg (IFB): +20 %, at most €9,000 per dwelling, not combinable with the KfW speed or income bonus.
- The FAQ ("Stand: 2025") still lists older rules: 20 % speed bonus, 20 % income bonus below €40,000, +5 %
  efficiency bonus, €30,000 cap. Prefer the subsidy page.

### This app vs. the form (at commit 8964403)

`src/ui/BuildingForm.tsx` copies the form: same questions, order and answers, in English. Differences:

- Consumption: the form asks in the fuel's own unit. Ours asks kWh only and always sends
  `fuelType: 'gas_kwh'`, so oil and pellet homes are priced as gas.
- Insulation: the form offers "Ja" and "Nein / Unbekannt". Ours offers Yes / No / I don't know, and an
  unanswered question becomes "No" (`z.coerce.boolean()` turns `''` into `false`).
- Ours adds "How much of your apartment is heated in winter?" (`winterHeatedShare`). The form does not ask it.
- Ours has no contact screen and no ZIP.
- Neither asks for occupants, but `heatingLoad.ts` still subtracts hot water per occupant, which is now 0.
- No assessment module uses the eight new fields yet: `heatingDistribution`, `buildingType`, `heatingSystem`,
  `facadeInsulated`, `roofInsulated`, `heatingSystemAge`, `replacementTiming`, `winterHeatedShare`.

Ways to use the form's answers:

- Ask consumption per fuel and derive `fuelType` from the heating answer.
- Estimate the subsidy from heating type and age (base plus speed bonus), and show the income bonus as a range.
- Map the heat load to the published sizes and price bands.
