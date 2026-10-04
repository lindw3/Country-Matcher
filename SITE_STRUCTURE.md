# Site Structure and Data Flow

## Application shape

The site is a Vite-hosted React and TypeScript single-page application with no API or account system. `src/App.tsx` owns the current screen, questionnaire section, answers, loaded dataset, and selected country. Screens are `intro`, `quiz`, `report`, and `methodology`; country detail is rendered inside the report state. There are no separate `/quiz`, `/results`, or country-detail routes.

On startup, the app fetches `${import.meta.env.BASE_URL}data/countries.json`. Answers are stored locally under `country-matcher-answers-v2` using this shape: point values and a point-section skip flag, ideal-statement choices, and median-band choices. Old answer data uses a different local-storage key and is not interpreted as the new schema.

## Source layout

```text
Country Matcher/
  data/                         # Local OWID extracts and gini.xlsx
  public/data/countries.json    # Generated browser dataset
  scripts/
    load_data.py               # Unified OWID catalog and local source readers
    create_dataset.py           # Optional historical Parquet export
    prepare_country_data.py     # Latest country values, percentiles, JSON export
  src/
    App.tsx                     # Screens and interactions
    main.tsx                    # React entry point
    styles.css                  # Visual tokens and responsive layouts
    domain/
      country.ts                # Country, dataset, and result types
      questions.ts              # Point groups, statements, medians, answer types
      matching.ts               # Median bands, scoring, and evidence rows
  index.html
  package.json
  requirements.txt
```

## Browser screens

- **Introduction** describes the comparison, displays dataset counts, and starts the questionnaire when country data has loaded.
- **Questionnaire** has three sections: allocate ten points, set ideal-society statement preferences, and choose median-relative ranges. It supports back/continue navigation and skipped preferences.
- **Results** shows the top match, the top-three shortlist, score-group bars, and weighted coverage.
- **Country breakdown** shows every active measure contribution with raw value and unit, observation year, peer percentile, and fit score.
- **Methodology** summarizes the scoring rules and limitations and returns to the previous app screen.

## Questionnaire and scoring

`src/domain/questions.ts` defines nine point groups. The respondent allocates exactly ten integer points across them or skips the allocation. The file also defines seven ideal-society statements, each offering “It doesn't matter”, full or partial disagreement, and partial or full agreement; and six median questions. Median questions can be skipped individually.

Ideal response multipliers are 0, -2, -1, +1, and +2. Positive values use the direction associated with agreeing with the statement, negative values reverse that direction, and the absolute value determines the statement's weight. “It doesn't matter” contributes no group.

`src/domain/matching.ts` always adds life satisfaction (`livstillfredsställelse`) as a higher-is-better General score with fixed weight 1. Each allocated point group averages the scores of its available measures and uses its point count as a weight. Ideal-statement groups score their configured measures in the agreement direction or its inverse, weighted by multiplier magnitude.

For each median question, the browser calculates the median of the latest country values present in `countries.json` and embeds it in a plain-language sentence. For a positive median, the five bands are below 50%, 50-75%, 75-125%, 125-150%, and above 150% of the median. The UI displays boundaries as absolute values with units. Foreign aid is displayed to two decimal places; other rates are rounded to whole percentages. Scoring uses unrounded boundaries. A value in the selected band scores 100; outside it, the score decreases linearly with distance and reaches zero one adjacent-band width beyond the nearest edge. If the median is zero or below, cutoffs use percentiles over distinct observed values instead, avoiding invalid negative ranges and reducing repeated cutoffs; the true median remains visible and the UI explains the fallback.

All active score groups are combined as a weighted average. Each answered median preference has weight one. When only part of a group's measures is available for a country, both its effective score weight and its contribution to coverage are scaled by the available fraction. A country requires at least 40% weighted coverage and some available score weight. Results are ordered by score and then coverage; twenty candidates are computed and the report displays the first three.

The exact currently scored and unused measures are listed in [OVERVIEW.md](OVERVIEW.md).

## Data preparation

```text
OWID Grapher endpoints + local files in data/
  -> scripts/load_data.py
  -> latest non-missing row per country and measure
  -> country-name normalization
  -> peer percentiles per measure
  -> public/data/countries.json
  -> browser median bands and country scoring
```

The JSON root contains `generatedAt`, `countryCount`, `measureCount`, and `countries`. Each country has a `name` and a `measures` object; each measure entry has `value`, `year`, and `percentile`.

The preparation script computes average-rank percentiles over countries with a value for that measure. It keeps the latest non-missing observation separately for each country and measure. This creates a mixed-year snapshot without a maximum observation age or shared-year rule. Source years travel with values into the country detail view.

`load_data.py` keeps OWID measures in one catalog of internal measure key, Grapher source, and optional source-column hint. A shared adapter identifies `Entity`, `Year` or `Day`, and the value column, then normalizes output to `land`, `år`, and the configured measure key. With no hint, exactly one numeric value column must be identifiable. Hints disambiguate sources with multiple numeric columns. The marriage/union series chooses the observed estimate rather than projections; generative-AI daily rows are reduced to the latest observation per country-year. Local CSVs and the Gini workbook use local readers. The variable description table covers all forty loaded measures.

Country names are normalized through `pycountry.countries.lookup` with a small alias map. Unresolved names are omitted; recognized territories can appear. `scripts/create_dataset.py` separately creates an outer-joined historical Parquet file; the website does not read it.

## Current boundaries

- All 40 loaded measures appear in the generated snapshot. Thirty-two affect questionnaire questions or scores; the other eight are named in [OVERVIEW.md](OVERVIEW.md).
- Country detail displays value, year, percentile, and fit, but not per-row OWID source URLs.
- The country snapshot must be generated before serving the app. The GitHub Pages workflow regenerates it during deployment.
- There is no automated test suite configured. `npm run build` performs the TypeScript project build and Vite production bundle.