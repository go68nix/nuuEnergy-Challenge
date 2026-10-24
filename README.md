# Heat pump suitability checker prototype

Browser-based prototype that ingests building data and runs modular heat-pump suitability checks.

## Run locally

```bash
npm install
npm run dev
```

Run tests:

```bash
npm test
```

## Chatbot setup

1. Copy `.env.example` to `.env`.
2. Open `.env` and paste your provider secret after `LLM_API_KEY=`:

   ```env
   LLM_API_KEY=paste-your-real-api-key-here
   ```

3. Check the connection with `npm run test:llm`.
4. Start the frontend and backend together with `npm run dev:full`.

The server reads `.env` at startup. Restart it after changing any environment variable. Never commit `.env` or put the key in frontend code.

## Architecture

- `src/core/`: pure assessment engine (no React imports)
  - `types.ts`: shared types (`BuildingInput`, `AssessmentResult`, `TrafficLight`, `ModuleResult`)
  - `schema.ts`: shared Zod schema for both CSV and form validation
  - `modules/`: each assessment step exports `{ id, label, run(building, context) => ModuleResult }`
  - `registry.ts`: ordered module list + `runAssessment(building)` execution
- `src/io/csv.ts`: CSV parsing and per-row validation split into valid rows and row errors
- `src/ui/`: UI components (`DropZone`, `BuildingForm`, `BuildingTable`, `ResultPanel`)

## Add a new assessment module

1. Add a new file in `src/core/modules/` exporting one module object with `id`, `label`, and `run`.
2. Add a single line import and entry in `assessmentModules` in `src/core/registry.ts`.
3. The result appears automatically in `ResultPanel` because rendering is generic.

## Glossary

- **Heizlast**: required heating output (kW) to keep indoor temperature at design conditions.
- **Vorlauftemperatur**: heating system supply temperature sent to emitters (radiators/floor heating).
- **JAZ** (Jahresarbeitszahl): seasonal performance factor; delivered heat divided by electrical input over a year.
- **Volllaststunden**: equivalent full-load operating hours used to convert annual energy demand to power.
- **Einrohrheizung**: single-pipe radiator circuit, often harder to optimize for low-temperature heat pumps.
