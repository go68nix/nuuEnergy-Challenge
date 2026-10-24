export type ReportLanguage = 'de' | 'en'
type LocaleMessage = { text: string; reason?: string }
type ReportLocale = {
  title: string; subtitle: string; back: string; viewReport: string; print: string; copy: string; copied: string; language: string
  sections: Record<'summary' | 'building' | 'findings' | 'missing' | 'grey' | 'checklist' | 'photos', string>
  labels: Record<string, string>
  traffic: Record<'green' | 'yellow' | 'red', string>
  summaryReasons: Record<'green' | 'yellow' | 'red', string[]>
  findings: Record<'heating' | 'flow' | 'pipe' | 'costs', string>
  fields: Record<string, string>
  values: Record<string, string>
  photoLabels: Record<string, string>
  evidence: Record<string, string>
  messages: Record<string, LocaleMessage>
  results: {
    verdictHeadline: Record<'green' | 'yellow' | 'red', string>
    verdictReason: string
    preliminary: string
    decidingFactors: string
    whyVerdict: string
    cards: Record<'heating' | 'flow' | 'pipe' | 'costs' | 'checklist', { headline: string; explanation: string }>
    confidence: Record<'provided' | 'estimated' | 'unknown', string>
    personalReasons: Record<string, string>
    notAvailable: string
    estimate: string
    startOver: string
    technicianReport: string
    missingSummary: string
  }
  chat: {
    title: string; newChat: string; close: string; inputPlaceholder: string; send: string; assistantOffline: string
    typing: string; retry: string; welcome: string; suggestions: string[]; resultsSuggestions: string[]
  }
  buildingModel: Record<string, string>
}

const messages: Record<ReportLanguage, ReportLocale> = {
  en: {
    title: 'Technician visit report', subtitle: 'Prepared for the on-site heating system review', back: 'Back to results', viewReport: 'Open technician report', print: 'Print / Save as PDF', copy: 'Copy as text', copied: 'Copied', language: 'Language',
    sections: { summary: 'Summary', building: 'Building data', findings: 'Findings', missing: 'Missing information', grey: 'Grey areas', checklist: 'On-site checklist', photos: 'Photos' },
    labels: { preliminary: 'This is a preliminary assessment, not a decision.', nothingFlagged: 'Nothing flagged.', source: 'Source', provided: 'Provided', estimated: 'Estimated', unknown: 'Unknown', high: 'High priority', normal: 'Normal priority', traffic: 'Preliminary traffic light', buildingId: 'Building', date: 'Report date', methodA: 'Consumption method', methodB: 'Area / building-age method', range: 'Combined estimated range', flowTemp: 'Flow temperature class', pipe: 'Pipe type', confidence: 'Confidence', basis: 'Basis', evidence: 'Evidence', currentCost: 'Current system annual cost', heatPumpCost: 'Estimated heat pump annual cost', savings: 'Estimated annual difference', jaz: 'Assumed seasonal performance (JAZ)', costBasis: 'Comparison uses assumed energy prices and seasonal performance.', yearFallback: 'Pipe type remains unknown; the fallback is based on building year {{year}} only.', notAvailable: 'Not available', yes: 'Yes', no: 'No', checkbox: 'Check on site' },
    traffic: { green: 'Green · promising', yellow: 'Yellow · review needed', red: 'Red · elevated risk' },
    summaryReasons: { green: ['The provided data shows no major pipe-system or energy-use warning.', 'The technician checks below are still required.'], yellow: ['Some key details are estimated, missing, or need on-site verification.', 'Review the grey areas and complete the checklist before deciding.'], red: ['The available data shows a significant technical or energy-use risk.', 'Resolve the high-priority checks before selecting a system.'] },
    findings: { heating: 'Heating load estimate', flow: 'Flow temperature', pipe: 'Heating pipe system', costs: 'Operating cost comparison' },
    fields: { fuel: 'Current energy source', consumption: 'Annual consumption', occupants: 'Occupants', constructionYear: 'Original construction year', floorArea: 'Heated floor area', heatingDistribution: 'Room heating', buildingType: 'Building type', heatingSystem: 'Current heating system', facade: 'Facade insulated', roof: 'Roof insulated', systemAge: 'Heating system age', replacementTiming: 'Replacement timing', winterShare: 'Area heated in winter', pipeSystem: 'Pipe system' },
    values: { gas_m3: 'Natural gas (m³)', gas_kwh: 'Natural gas (kWh)', heating_oil_l: 'Heating oil (L)', radiator: 'Radiator', underfloor: 'Underfloor heating', mixed: 'Underfloor heating and radiator', single_two_family: 'Single or two family house', apartment: 'Apartment building', end_terrace: 'End-of-terrace house', mid_terrace: 'Terraced house · middle', semi_detached: 'Semi-detached house', gas: 'Gas heating', oil: 'Oil heating', pellet: 'Pellet', gas_condensing: 'Condensing gas boiler', oil_condensing: 'Condensing oil heating', district_other: 'District heating or other', 'two-pipe': 'Two-pipe', 'single-pipe': 'Single-pipe', half: 'About one half', third: 'About one third', quarter: 'About one quarter', other: 'Other', '0_9': '0–9 years', '10_19': '10–19 years', '20_29': '20–29 years', '30_plus': '30+ years', immediately: 'Immediately', '1_3_months': 'In 1 to 3 months', '3_6_months': 'In 3 to 6 months', over_6_months: 'In more than 6 months', not_planned: 'Not currently planned', true: 'Yes', false: 'No', unknown: 'Unknown' },
    photoLabels: { 'single-pipe': 'Likely single-pipe', 'two-pipe': 'Two-pipe · low risk', 'pipe-unclear': 'Pipe type unclear', 'not-heater': 'Not a heater' },
    evidence: { 'Bypass piece between the pipes at the radiator': 'Bypass piece between the pipes at the radiator', 'Flow continues through the radiator branch': 'Flow continues through the radiator branch', 'Separate supply and return pipes': 'Separate supply and return pipes', 'Independent flow path to the radiator': 'Independent flow path to the radiator', 'Pipe connections are visible': 'Pipe connections are visible', 'The system type cannot be distinguished clearly': 'The system type cannot be distinguished clearly', 'No recognizable heater or radiator connection': 'No recognizable heater or radiator connection' },
    messages: {
      'heating.missingOccupants': { text: 'Occupant count not provided', reason: 'The consumption-based heating load method subtracts an assumed hot-water allowance per occupant.' },
      'heating.verify': { text: 'Complete a DIN EN 12831 heating-load calculation', reason: 'The consumption and building-area methods are screening estimates, not room-by-room design calculations.' },
      'heating.disagreement': { text: 'Heating-load methods differ by more than {{percent}}%', reason: 'The consumption estimate and the midpoint of the building-area estimate differ beyond the configured tolerance.' },
      'cost.assumptions': { text: 'Confirm the operating-cost assumptions', reason: 'The comparison uses assumed energy prices and a default seasonal performance value unless a JAZ was supplied.' },
      'energy.implausible': { text: 'Check the energy use per heated area', reason: 'The converted annual consumption is outside the configured plausible range of {{min}}–{{max}} kWh/m².' },
      'pipe.missing': { text: 'Pipe system is not confirmed', reason: 'The pipe type is unknown or was not provided.' },
      'pipe.estimate': { text: 'Verify the estimated pipe type', reason: 'The pipe classification came from a photo estimate and is not confirmed.' },
      'pipe.verify': { text: 'Verify the radiator pipe circuit on site', reason: 'Confirm whether supply and return are separate and whether a bypass is present.' },
      'pipe.yearMismatch': { text: 'Photo estimate differs from the building-year estimate', reason: 'The photo-based pipe type does not match the broad estimate derived from construction year.' },
      'pipe.photoUnclear': { text: 'Pipe system unclear in the photo', reason: 'The photo result could not distinguish the pipe layout.' },
      'radiators.missing': { text: 'Radiator assessment not available', reason: 'No radiator sizing or flow-temperature assessment was performed by this tool.' },
      'technician.roomSizing': { text: 'Check room-by-room sizing and hydraulic balancing', reason: 'Verify emitter output at the planned flow temperature and balance the heating circuit.' },
      'technician.electrical': { text: 'Check electrical capacity and meter cabinet', reason: 'Confirm the available electrical connection and meter-cabinet capacity for the selected heat pump.' },
      'technician.location': { text: 'Check outdoor-unit location, noise, and permits', reason: 'Review clearances, neighbor noise exposure, condensate handling, and local permit requirements.' },
      'system.ageMissing': { text: 'Heating-system age is unknown', reason: 'The system age was not provided or was marked unknown.' },
      'system.oldBuilding': { text: 'Review heating-system replacement timing', reason: 'The building is at least {{years}} years old and the heating-system age is unknown; building age alone does not establish boiler age.' },
      'summary.singlePipe': { text: 'A confirmed single-pipe circuit needs a flow-temperature and emitter review.' },
      'summary.estimatedPipe': { text: 'The pipe type is estimated or unknown, so compatibility needs an on-site check.' },
      'summary.energy': { text: 'Energy use per heated area is outside the configured screening range.' },
      'summary.complete': { text: 'No major pipe or energy-use warning was identified from the provided inputs.' },
    },
    results: {
      verdictHeadline: { green: 'Your home looks ready for a heat pump', yellow: 'Possible, with a few things to check first', red: 'Not ready yet, but here is what stands in the way' },
      verdictReason: 'This preliminary verdict combines the heating load, heating distribution, pipe system, and the information provided.',
      preliminary: 'Preliminary assessment based on the information provided. A technician will confirm on site.',
      decidingFactors: 'Deciding factors', whyVerdict: 'Why this verdict',
      cards: {
        heating: { headline: 'Heating load', explanation: 'The estimated design heat demand sets the size of the heat pump.' },
        flow: { headline: 'Flow temperature and radiators', explanation: 'Lower flow temperatures generally support better heat-pump efficiency.' },
        pipe: { headline: 'Pipe system', explanation: 'The pipe circuit affects how easily the existing heating system can be adapted.' },
        costs: { headline: 'Running costs', explanation: 'This comparison uses the current energy use and an estimated seasonal heat-pump performance.' },
        checklist: { headline: 'Insulation advice', explanation: 'Improving the building envelope can reduce the required heat-pump size.' },
      },
      confidence: { provided: 'provided', estimated: 'estimated', unknown: 'unknown' },
      personalReasons: {
        underfloor: 'Your underfloor heating can usually work with lower flow temperatures, and the estimated heating load is {{range}}.',
        moderateLoad: 'The estimated heating load is {{range}}, which gives the technician a manageable starting point for system sizing.',
        highLoad: 'The estimated heating load is {{range}}. The building envelope and room-by-room sizing deserve particular attention before a final system is chosen.',
        twoPipe: 'A confirmed two-pipe system is a helpful starting point because supply and return are separated.',
        singlePipe: 'The confirmed single-pipe system may require higher flow temperatures, so radiator output and the pipe circuit need an on-site review.',
        pipeUnknown: 'The pipe system is not confirmed yet, so a technician should check the radiator connections before sizing the heat pump.',
        saving: 'At the assumed energy prices, the heat-pump estimate is about {{amount}} cheaper per year than the current system.',
        extraCost: 'At the assumed energy prices, the heat-pump estimate is about {{amount}} more per year, so the assumptions should be checked carefully.',
        costSimilar: 'The two annual running-cost estimates are broadly similar; the result depends on the final system performance and energy prices.',
      },
      notAvailable: 'Not available yet', estimate: 'estimate', startOver: 'Start over', technicianReport: 'View technician report',
      missingSummary: 'items still need checking on site',
    },
    buildingModel: {
      title: '3D building model (public data)', intro: 'Built from live OpenStreetMap data for the entered address. Drag to rotate, scroll to zoom, right-drag to move.',
      loading: 'Searching the building in OpenStreetMap…', noLocation: 'No address was entered, so there is no 3D model.', needsExactAddress: 'No 3D model: it needs the exact address with street and house number.',
      loadFailed: 'Could not load the building data', noWebgl: 'This browser cannot show 3D graphics (WebGL).',
      legendHeating: 'Possible heating surfaces (radiator zones), not surveyed', legendFloor: 'Possible underfloor heating, not surveyed', legendUnit: 'Possible outdoor unit spots, #1 is the quietest for neighbours', legendNeighbour: 'Neighbouring buildings', legendAlternative: 'Other possible buildings (match uncertain)',
      building: 'Building', tileOutline: 'outline from OpenFreeMap tiles', footprint: 'Footprint', storeys: 'Storeys', osm_levels: 'OSM building:levels', osm_height: 'OSM height', heated_area: 'derived: heated area ÷ footprint', walls: 'Free / shared exterior walls',
      match: 'Building match', matchIdentity: 'settled: the geocoder returned this OSM building for the address', matchJudges: 'settled: head-to-head confidence {{confidence}} from the judges', matchUncertain: 'uncertain (confidence {{confidence}}): check the building on site',
      heatingNotGiven: 'Heating type not given: radiator walls are shown.',
      spotsTitle: 'Outdoor unit spots', facing: 'Wall faces', neighbour: 'Nearest neighbour', max35: 'Max. sound power for 35 dB(A) at night', max40: 'for 40 dB(A)', noNeighbour: 'none within 80 m',
      spotNote: 'Free-field estimate (Q = 4, unit in front of one wall) against the TA Lärm night limits at the nearest neighbouring building: 35 dB(A) in purely residential, 40 dB(A) in general residential areas. Barriers, reflections and tonality are not included. Compare with the sound power on the data sheet of the planned unit.',
      searchTitle: 'How the building was found (SIFT ranking and AB-MCTS steps)', candidate: 'Candidate', strength: 'Bradley-Terry strength', votesWon: 'Judge votes won', step: 'Step', source: 'Source', kind: 'Kind', index: 'UCB / s', confidence: 'Confidence', duration: 'Time', outcome: 'Result',
      compass: 'N,NE,E,SE,S,SW,W,NW', attribution: 'Map data © OpenStreetMap contributors (ODbL), via Nominatim, OpenFreeMap and Photon.',
    },
    chat: { title: 'Assessment helper', newChat: 'New chat', close: 'Close', inputPlaceholder: 'Ask about your assessment…', send: 'Send', assistantOffline: 'Assistant offline', typing: 'Thinking…', retry: 'Try again', welcome: 'Ask me about your questionnaire or heat-pump result. I will use only the information provided here.', suggestions: ['What should I prepare for the technician?', 'What does a heat pump do?'], resultsSuggestions: ['Why is my result yellow?', 'What does the heating load mean?'] },
  },
  de: {
    title: 'Technikerbericht für den Vor-Ort-Termin', subtitle: 'Vorbereitet für die Prüfung der Heizungsanlage vor Ort', back: 'Zurück zu den Ergebnissen', viewReport: 'Technikerbericht öffnen', print: 'Drucken / als PDF speichern', copy: 'Als Text kopieren', copied: 'Kopiert', language: 'Sprache',
    sections: { summary: 'Zusammenfassung', building: 'Gebäudedaten', findings: 'Ergebnisse', missing: 'Fehlende Angaben', grey: 'Unsicherheiten', checklist: 'Vor-Ort-Checkliste', photos: 'Fotos' },
    labels: { preliminary: 'Dies ist eine vorläufige Einschätzung, keine Entscheidung.', nothingFlagged: 'Nichts hervorgehoben.', source: 'Quelle', provided: 'Angegeben', estimated: 'Geschätzt', unknown: 'Unbekannt', high: 'Hohe Priorität', normal: 'Normale Priorität', traffic: 'Vorläufige Ampelbewertung', buildingId: 'Gebäude', date: 'Berichtsdatum', methodA: 'Verbrauchsmethode', methodB: 'Fläche / Gebäudealter', range: 'Kombinierter Schätzbereich', flowTemp: 'Vorlauftemperaturklasse', pipe: 'Rohrsystem', confidence: 'Konfidenz', basis: 'Grundlage', evidence: 'Hinweise', currentCost: 'Jährliche Kosten der aktuellen Anlage', heatPumpCost: 'Geschätzte jährliche Wärmepumpenkosten', savings: 'Geschätzte jährliche Differenz', jaz: 'Angenommene Jahresarbeitszahl (JAZ)', costBasis: 'Vergleich mit angenommenen Energiepreisen und einer angenommenen Jahresarbeitszahl.', yearFallback: 'Rohrsystem unbekannt; Rückfallannahme nur anhand des Baujahrs {{year}}.', notAvailable: 'Nicht verfügbar', yes: 'Ja', no: 'Nein', checkbox: 'Vor Ort prüfen' },
    traffic: { green: 'Grün · aussichtsreich', yellow: 'Gelb · Prüfung erforderlich', red: 'Rot · erhöhtes Risiko' },
    summaryReasons: { green: ['Die angegebenen Daten zeigen keine wesentlichen Warnhinweise zum Rohrsystem oder Energieverbrauch.', 'Die nachstehenden Technikerprüfungen sind weiterhin erforderlich.'], yellow: ['Einige wichtige Angaben sind geschätzt, fehlen oder müssen vor Ort geprüft werden.', 'Prüfen Sie die Unsicherheiten und bearbeiten Sie die Checkliste vor einer Entscheidung.'], red: ['Die verfügbaren Daten zeigen ein wesentliches technisches oder energetisches Risiko.', 'Klären Sie die Punkte mit hoher Priorität, bevor Sie ein System auswählen.'] },
    findings: { heating: 'Heizlastschätzung', flow: 'Vorlauftemperatur', pipe: 'Heizungsrohrsystem', costs: 'Vergleich der Betriebskosten' },
    fields: { fuel: 'Aktueller Energieträger', consumption: 'Jahresverbrauch', occupants: 'Bewohnerzahl', constructionYear: 'Ursprüngliches Baujahr', floorArea: 'Beheizte Fläche', heatingDistribution: 'Raumheizung', buildingType: 'Gebäudetyp', heatingSystem: 'Aktuelle Heizungsanlage', facade: 'Fassade gedämmt', roof: 'Dach gedämmt', systemAge: 'Alter der Heizungsanlage', replacementTiming: 'Zeitpunkt des Austauschs', winterShare: 'Im Winter beheizter Bereich', pipeSystem: 'Rohrsystem' },
    values: { gas_m3: 'Erdgas (m³)', gas_kwh: 'Erdgas (kWh)', heating_oil_l: 'Heizöl (L)', radiator: 'Heizkörper', underfloor: 'Fußbodenheizung', mixed: 'Fußbodenheizung und Heizkörper', single_two_family: 'Ein- oder Zweifamilienhaus', apartment: 'Mehrfamilienhaus', end_terrace: 'Reihenendhaus', mid_terrace: 'Reihenmittelhaus', semi_detached: 'Doppelhaushälfte', gas: 'Gasheizung', oil: 'Ölheizung', pellet: 'Pelletheizung', gas_condensing: 'Gas-Brennwertkessel', oil_condensing: 'Öl-Brennwertheizung', district_other: 'Fernwärme oder andere', 'two-pipe': 'Zweirohrsystem', 'single-pipe': 'Einrohrsystem', half: 'Etwa die Hälfte', third: 'Etwa ein Drittel', quarter: 'Etwa ein Viertel', other: 'Andere Fläche', '0_9': '0–9 Jahre', '10_19': '10–19 Jahre', '20_29': '20–29 Jahre', '30_plus': '30+ Jahre', immediately: 'Sofort', '1_3_months': 'In 1 bis 3 Monaten', '3_6_months': 'In 3 bis 6 Monaten', over_6_months: 'In mehr als 6 Monaten', not_planned: 'Derzeit nicht geplant', true: 'Ja', false: 'Nein', unknown: 'Unbekannt' },
    photoLabels: { 'single-pipe': 'Wahrscheinlich Einrohrsystem', 'two-pipe': 'Zweirohrsystem · niedriges Risiko', 'pipe-unclear': 'Rohrsystem unklar', 'not-heater': 'Kein Heizkörper erkannt' },
    evidence: { 'Bypass piece between the pipes at the radiator': 'Überbrückungsstück zwischen den Rohren am Heizkörper', 'Flow continues through the radiator branch': 'Der Durchfluss setzt sich im Heizkörperzweig fort', 'Separate supply and return pipes': 'Getrennte Vor- und Rücklaufrohre', 'Independent flow path to the radiator': 'Unabhängiger Durchfluss zum Heizkörper', 'Pipe connections are visible': 'Rohranschlüsse sind sichtbar', 'The system type cannot be distinguished clearly': 'Der Systemtyp ist nicht eindeutig erkennbar', 'No recognizable heater or radiator connection': 'Kein eindeutiger Heizkörper- oder Heizungsanschluss erkennbar' },
    messages: {
      'heating.missingOccupants': { text: 'Bewohnerzahl nicht angegeben', reason: 'Die verbrauchsbasierte Heizlastmethode zieht je Bewohner einen angenommenen Warmwasserbedarf ab.' },
      'heating.verify': { text: 'Heizlastberechnung nach DIN EN 12831 durchführen', reason: 'Die Verbrauchs- und Gebäudeabschätzung ersetzt keine raumweise Auslegungsberechnung.' },
      'heating.disagreement': { text: 'Die Heizlastmethoden weichen um mehr als {{percent}}% ab', reason: 'Verbrauchsschätzung und Mittelpunkt der Gebäudeabschätzung überschreiten die eingestellte Abweichung.' },
      'cost.assumptions': { text: 'Annahmen zum Betriebskostenvergleich bestätigen', reason: 'Der Vergleich nutzt angenommene Energiepreise und eine Standard-Jahresarbeitszahl, sofern keine JAZ angegeben wurde.' },
      'energy.implausible': { text: 'Energieverbrauch je beheizter Fläche prüfen', reason: 'Der umgerechnete Jahresverbrauch liegt außerhalb des eingestellten plausiblen Bereichs von {{min}}–{{max}} kWh/m².' },
      'pipe.missing': { text: 'Rohrsystem nicht bestätigt', reason: 'Das Rohrsystem ist unbekannt oder wurde nicht angegeben.' },
      'pipe.estimate': { text: 'Geschätztes Rohrsystem vor Ort prüfen', reason: 'Die Einstufung stammt aus einer Fotoschätzung und ist nicht bestätigt.' },
      'pipe.verify': { text: 'Heizkörper-Rohrkreis vor Ort prüfen', reason: 'Prüfen Sie, ob Vor- und Rücklauf getrennt sind und ein Bypass vorhanden ist.' },
      'pipe.yearMismatch': { text: 'Fotoschätzung weicht von der Baujahrschätzung ab', reason: 'Das fotobasierte Rohrsystem stimmt nicht mit der groben Baujahrschätzung überein.' },
      'pipe.photoUnclear': { text: 'Rohrsystem auf dem Foto unklar', reason: 'Das Foto ermöglicht keine eindeutige Unterscheidung des Rohrverlaufs.' },
      'radiators.missing': { text: 'Heizkörperbewertung nicht verfügbar', reason: 'Dieses Tool hat keine Heizkörperauslegung oder Vorlauftemperaturprüfung durchgeführt.' },
      'technician.roomSizing': { text: 'Raumweise Auslegung und hydraulischen Abgleich prüfen', reason: 'Prüfen Sie die Heizkörperleistung bei geplanter Vorlauftemperatur und gleichen Sie den Heizkreis ab.' },
      'technician.electrical': { text: 'Elektrische Leistung und Zählerschrank prüfen', reason: 'Bestätigen Sie den elektrischen Anschluss und die Kapazität des Zählerschranks für die Wärmepumpe.' },
      'technician.location': { text: 'Aufstellort, Geräusche und Genehmigungen prüfen', reason: 'Prüfen Sie Abstände, Lärmauswirkung auf Nachbarn, Kondensatführung und Genehmigungspflichten.' },
      'system.ageMissing': { text: 'Alter der Heizungsanlage unbekannt', reason: 'Das Anlagenalter wurde nicht angegeben oder als unbekannt markiert.' },
      'system.oldBuilding': { text: 'Austauschzeitpunkt der Heizungsanlage prüfen', reason: 'Das Gebäude ist mindestens {{years}} Jahre alt und das Anlagenalter unbekannt; das Baujahr belegt nicht das Kesselalter.' },
      'summary.singlePipe': { text: 'Ein bestätigtes Einrohrsystem erfordert eine Prüfung von Vorlauftemperatur und Heizflächen.' },
      'summary.estimatedPipe': { text: 'Das Rohrsystem ist geschätzt oder unbekannt und muss vor Ort geprüft werden.' },
      'summary.energy': { text: 'Der Energieverbrauch je beheizter Fläche liegt außerhalb des eingestellten Prüfkorridors.' },
      'summary.complete': { text: 'Die angegebenen Daten zeigen keine wesentlichen Warnhinweise zum Rohrsystem oder Energieverbrauch.' },
    },
    results: {
      verdictHeadline: { green: 'Ihr Gebäude wirkt für eine Wärmepumpe geeignet', yellow: 'Möglich, aber einige Punkte sollten zuerst geprüft werden', red: 'Noch nicht bereit – das steht derzeit im Weg' },
      verdictReason: 'Diese vorläufige Einschätzung kombiniert Heizlast, Wärmeverteilung, Rohrsystem und die angegebenen Daten.',
      preliminary: 'Vorläufige Einschätzung auf Basis der angegebenen Informationen. Ein Techniker bestätigt dies vor Ort.',
      decidingFactors: 'Entscheidende Faktoren', whyVerdict: 'Warum dieses Ergebnis',
      cards: {
        heating: { headline: 'Heizlast', explanation: 'Die geschätzte Heizlast bestimmt die Größe der Wärmepumpe.' },
        flow: { headline: 'Vorlauftemperatur und Heizkörper', explanation: 'Niedrige Vorlauftemperaturen unterstützen normalerweise einen effizienten Wärmepumpenbetrieb.' },
        pipe: { headline: 'Rohrsystem', explanation: 'Das Rohrsystem beeinflusst, wie leicht die bestehende Heizung angepasst werden kann.' },
        costs: { headline: 'Betriebskosten', explanation: 'Der Vergleich nutzt den aktuellen Verbrauch und eine geschätzte Jahresarbeitszahl.' },
        checklist: { headline: 'Dämmempfehlung', explanation: 'Eine bessere Gebäudehülle kann die erforderliche Wärmepumpengröße reduzieren.' },
      },
      confidence: { provided: 'angegeben', estimated: 'geschätzt', unknown: 'unbekannt' },
      personalReasons: {
        underfloor: 'Ihre Fußbodenheizung kann meist mit niedrigeren Vorlauftemperaturen arbeiten; die geschätzte Heizlast liegt bei {{range}}.',
        moderateLoad: 'Die geschätzte Heizlast liegt bei {{range}}. Das ist ein gut handhabbarer Ausgangspunkt für die Auslegung durch den Techniker.',
        highLoad: 'Die geschätzte Heizlast liegt bei {{range}}. Gebäudehülle und raumweise Auslegung sollten vor der endgültigen Auswahl besonders geprüft werden.',
        twoPipe: 'Ein bestätigtes Zweirohrsystem ist ein guter Ausgangspunkt, weil Vor- und Rücklauf getrennt sind.',
        singlePipe: 'Das bestätigte Einrohrsystem kann höhere Vorlauftemperaturen erfordern; Heizkörperleistung und Rohrkreis müssen vor Ort geprüft werden.',
        pipeUnknown: 'Das Rohrsystem ist noch nicht bestätigt. Ein Techniker sollte die Heizkörperanschlüsse vor der Auslegung prüfen.',
        saving: 'Unter den angenommenen Energiepreisen liegen die geschätzten Wärmepumpenkosten etwa {{amount}} pro Jahr niedriger.',
        extraCost: 'Unter den angenommenen Energiepreisen liegen die geschätzten Wärmepumpenkosten etwa {{amount}} pro Jahr höher; die Annahmen sollten geprüft werden.',
        costSimilar: 'Die beiden jährlichen Betriebskostenschätzungen liegen nahe beieinander; entscheidend sind die endgültige Anlagenleistung und Energiepreise.',
      },
      notAvailable: 'Noch nicht verfügbar', estimate: 'Schätzung', startOver: 'Neu starten', technicianReport: 'Technikerbericht ansehen',
      missingSummary: 'Punkte müssen noch vor Ort geprüft werden',
    },
    buildingModel: {
      title: '3D-Gebäudemodell (öffentliche Daten)', intro: 'Aus aktuellen OpenStreetMap-Daten für die eingegebene Adresse. Ziehen zum Drehen, Mausrad zum Zoomen, rechte Maustaste zum Verschieben.',
      loading: 'Gebäude wird in OpenStreetMap gesucht…', noLocation: 'Keine Adresse angegeben, daher kein 3D-Modell.', needsExactAddress: 'Kein 3D-Modell: Dafür braucht es die genaue Adresse mit Straße und Hausnummer.',
      loadFailed: 'Gebäudedaten konnten nicht geladen werden', noWebgl: 'Dieser Browser kann keine 3D-Grafik (WebGL) anzeigen.',
      legendHeating: 'Mögliche Heizflächen (Heizkörperzonen), nicht vermessen', legendFloor: 'Mögliche Fußbodenheizung, nicht vermessen', legendUnit: 'Mögliche Standorte der Außeneinheit, #1 ist für Nachbarn am leisesten', legendNeighbour: 'Nachbargebäude', legendAlternative: 'Andere mögliche Gebäude (Zuordnung unsicher)',
      building: 'Gebäude', tileOutline: 'Umriss aus OpenFreeMap-Kacheln', footprint: 'Grundfläche', storeys: 'Geschosse', osm_levels: 'OSM building:levels', osm_height: 'OSM-Höhe', heated_area: 'abgeleitet: Wohnfläche ÷ Grundfläche', walls: 'Freie / angebaute Außenwände',
      match: 'Gebäudezuordnung', matchIdentity: 'gesichert: Der Geocoder hat genau dieses OSM-Gebäude für die Adresse geliefert', matchJudges: 'gesichert: Konfidenz {{confidence}} im direkten Vergleich der Richter', matchUncertain: 'unsicher (Konfidenz {{confidence}}): Gebäude vor Ort prüfen',
      heatingNotGiven: 'Heizungsart nicht angegeben: Heizkörperwände werden gezeigt.',
      spotsTitle: 'Standorte der Außeneinheit', facing: 'Wand zeigt nach', neighbour: 'Nächstes Nachbargebäude', max35: 'Max. Schallleistung für 35 dB(A) nachts', max40: 'für 40 dB(A)', noNeighbour: 'keins im Umkreis von 80 m',
      spotNote: 'Freifeld-Abschätzung (Q = 4, Gerät vor einer Wand) gegen die Nachtwerte der TA Lärm am nächsten Nachbargebäude: 35 dB(A) im reinen, 40 dB(A) im allgemeinen Wohngebiet. Hindernisse, Reflexionen und Tonhaltigkeit sind nicht berücksichtigt. Mit der Schallleistung aus dem Datenblatt des geplanten Geräts vergleichen.',
      searchTitle: 'Wie das Gebäude gefunden wurde (SIFT-Ranking und AB-MCTS-Schritte)', candidate: 'Kandidat', strength: 'Bradley-Terry-Stärke', votesWon: 'Gewonnene Richterstimmen', step: 'Schritt', source: 'Quelle', kind: 'Art', index: 'UCB / s', confidence: 'Konfidenz', duration: 'Dauer', outcome: 'Ergebnis',
      compass: 'N,NO,O,SO,S,SW,W,NW', attribution: 'Kartendaten © OpenStreetMap-Mitwirkende (ODbL), über Nominatim, OpenFreeMap und Photon.',
    },
    chat: { title: 'Assistent für Ihre Einschätzung', newChat: 'Neuer Chat', close: 'Schließen', inputPlaceholder: 'Frage zu Ihrer Einschätzung…', send: 'Senden', assistantOffline: 'Assistent nicht verfügbar', typing: 'Denkt nach…', retry: 'Erneut versuchen', welcome: 'Fragen Sie mich zu Ihrem Fragebogen oder Wärmepumpenergebnis. Ich nutze nur die hier angegebenen Informationen.', suggestions: ['Was soll ich für den Techniker vorbereiten?', 'Was macht eine Wärmepumpe?'], resultsSuggestions: ['Warum ist mein Ergebnis gelb?', 'Was bedeutet die Heizlast?'] },
  },
}

export const REPORT_LOCALES = messages
export type ReportMessages = typeof REPORT_LOCALES.en

export const formatReportTemplate = (template: string, params?: Record<string, string | number>) =>
  Object.entries(params ?? {}).reduce((text, [key, value]) => text.replaceAll(`{{${key}}}`, String(value)), template)
