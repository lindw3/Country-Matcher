# Site Structure and Data Flow

## Application shape

The site is a Vite-hosted React and TypeScript single-page application. It has no API or account system. `src/App.tsx` owns the current screen, questionnaire position, answers, loaded dataset, and selected country. The screen states are `intro`, `quiz`, `report`, and `methodology`; country detail is rendered inside the report state.

On startup, the app fetches `/data/countries.json`. Questionnaire answers are loaded from and saved to local storage under `country-matcher-answers-v1`. The current dataset itself is a static JSON file generated before the app is run.

## Source layout

```text
Country Matcher/
  data/                         # Local OWID extracts and gini.xlsx
  public/data/countries.json    # Generated browser dataset
  scripts/
    load_data.py               # Source series and variable descriptions
    create_dataset.py           # Optional historical outer-joined Parquet export
    prepare_country_data.py     # Latest-country values, percentiles, JSON export
  src/
    App.tsx                     # Screens and user interactions
    main.tsx                    # React entry point
    styles.css                  # Design tokens and responsive styles
    domain/
      country.ts                # Country and dataset types
      questions.ts              # Question and answer definitions
      matching.ts               # Directions, labels, units, scoring, detail rows
  index.html
  package.json
  requirements.txt
```

## Browser screens

- **Introduction** shows the purpose, data counts/date, privacy note, and questionnaire entry point.
- **Questionnaire** displays one prompt at a time, a progress bar, back and continue controls, and a skip action. Existing answers remain when moving backward. Starting over clears the saved answers.
- **Results** shows the highest-ranked match, three countries in the shortlist, active area scores, and coverage. The top-country rows open its evidence table.
- **Country breakdown** displays measure, raw value and unit, observation year, peer percentile, and fit contribution. The year is moved under the value on narrow screens.
- **Methodology** explains the broad scoring rules and limitations; it returns to the screen from which it was opened.

There are no `/quiz`, `/results`, `/compare`, or `/countries/:slug` routes in the current implementation. Navigation is handled with local React state.

## Questionnaire and scoring modules

`src/domain/questions.ts` defines nine importance prompts and three target prompts. Importance responses map to weights 3, 2, 1, or 0 for a skipped area. Target answers map to peer percentiles 10, 30, 50, 70, and 90. Every prompt can be skipped. A target is only scored if the respondent also assigns positive importance to that target's area.

`src/domain/matching.ts` contains the current direction choices, presentation labels, units, and pure scoring functions. Direction-based values are already represented as country peer percentiles by the Python preparation step. The matching function applies the selected direction, averages available measure scores within each area, then averages area scores according to the respondent's importance weights. A selected target replaces the default direction for that measure (currently relevant to working hours).

The denominator for coverage is the set of distinct measures active in the respondent's answers. A country needs at least one scored value and coverage of 40% or more. Missing area scores do not contribute to that country's weighted average. Eligible results are sorted by score, with coverage as the tie-breaker; up to twenty results are computed and the page displays the first three.

## Data preparation

The data path used by the website is:

```text
OWID Grapher endpoints + local files in data/
  -> scripts/load_data.py
  -> one latest non-missing row per country and measure
  -> canonical country-name lookup
  -> peer percentile per measure
  -> public/data/countries.json
  -> browser matching and report
```

The JSON root contains `generatedAt`, `countryCount`, `measureCount`, and `countries`. Each country has a `name` and a `measures` object. Each available measure entry contains:

```json
{
  "value": 12.3,
  "year": 2024,
  "percentile": 71.25
}
```

Percentiles are computed with pandas' average rank percentile over the country values available for that measure. The preparation step sorts each country's non-missing observations by year and keeps the latest one independently per measure. It therefore produces a mixed-year snapshot; it does not enforce a common year, recency window, or minimum coverage at data-build time. Measure year travels with each value for display.

`load_data.py` loads the original indicator set and all sixteen additional OWID measures specified for the project. It also loads the local conflict-deaths CSV as an absolute count. Its `variable_descriptions` table documents all forty resulting series. The marriage/union adapter selects the observed estimate column and excludes projected values. The AI adapter selects `ai_user_share`, converts date rows to years, and keeps the latest row per country-year. Other new Grapher adapters identify `Entity`, `Year` or `Day`, and the measure column from the response schema. Several earlier series still use explicit positional column renaming.

The local sources include electoral democracy, per-person primary energy use, Gini (`data/gini.xlsx`), and conflict deaths. Country names are converted with `pycountry.countries.lookup` and aliases for selected alternate names. Entries that do not resolve are discarded; ISO-recognized territories can be included.

`scripts/create_dataset.py` remains a separate utility that outer-joins all loaded series on country and year and writes `data/combined_dataset.parquet`. The browser preparation script does not use that Parquet file.

## Current boundaries

- The generated JSON includes all loaded measures, but only the curated subset listed in [OVERVIEW.md](OVERVIEW.md) currently affects rankings.
- The JSON does not carry source URLs or full per-measure provenance metadata. Source endpoints and local paths are in `scripts/load_data.py`; source citations are not yet shown on each country detail row.
- The data snapshot is generated locally and must exist before the website can display matches. If it is missing or cannot be fetched, the start action remains unavailable and the app displays a data error.
- There is no automated test suite configured yet. `npm run build` runs TypeScript's project build and creates the Vite production bundle.