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
- **Questionnaire** has four sections: allocate fifteen points, ideal-society preferences, optional WVS Social Values responses, and median-relative ranges. It supports back/continue navigation and skips.
- **Results** shows the top match, the top-three shortlist, score-group bars, and weighted coverage.
- **Country breakdown** shows every active measure contribution with raw value and unit, observation year, peer percentile, and fit score.
- **Methodology** summarizes the scoring rules and limitations and returns to the previous app screen.

## Questionnaire and scoring

`src/domain/questions.ts` defines nine priority groups, six ideal statements, five median questions, and WVS answer types. Healthcare-spending and foreign-aid questions are excluded. Respondents allocate fifteen points or skip the allocation. Saved points and responses for removed questions are filtered out when loading answers. WVS definitions and source scales travel in `wvsQuestions`; responses are stored under `answers.values`.

Ideal response multipliers are 0, -2, -1, +1, and +2. Positive values use the direction associated with agreeing with the statement, negative values reverse that direction, and the absolute value determines the statement's weight. “It doesn't matter” contributes no group.

`src/domain/matching.ts` only scores answered preferences. Priority groups average their available statistical measures and use allocated points as their raw multiplier. Ideal statements use agreement direction or its inverse and strength one or two. Every contribution, including priority groups, shares its area's averaging denominator. There is no life-satisfaction extraction or fixed General score.

For each median question, the browser calculates the median of the latest country values and embeds it in a sentence. Positive-median boundaries are 50%, 75%, 125%, and 150% of the median. Military spending is displayed to one decimal; other rates use whole percentages. Categories use unrounded boundaries and score 100, 75, 50, 25, or 0 by step distance. Zero-median items retain the distinct-value percentile fallback.

All active score groups are combined as a weighted average. WVS, ideal, median, and priority strengths are divided by the number of answered contributions in their shared category. A priority group counts once even if it contains several raw measures; WVS questions count individually. When only part of a group's measures is available, effective score weight and coverage are scaled by the available fraction. Countries require at least 40% weighted coverage and nonzero score weight; WVS eligibility separately requires 70% coverage by answered-question count. Results are ordered by score, then coverage. Detail rows are grouped contiguously by area and include priority-allocation labels, effective multipliers, one-decimal survey means, and survey periods.

The current inventory and summary behavior are described in [OVERVIEW.md](OVERVIEW.md). Summary evidence includes all priority groups, including zero-point/skipped groups, and every active non-priority preference. Zero-weight priority groups are display-only: they retain available values and percentiles but have null fit scores and zero influence. They are excluded from category counts, scoring, matched-measure counts, and coverage. Missing country values and percentiles are null and never imputed.

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

`load_data.py` keeps OWID measures in one catalog of internal measure key, Grapher source, and optional source-column hint. A shared adapter identifies `Entity`, `Year` or `Day`, and the value column, then normalizes output to `land`, `år`, and the configured measure key. With no hint, exactly one numeric value column must be identifiable. Hints disambiguate sources with multiple numeric columns. The marriage/union series chooses the observed estimate rather than projections; generative-AI daily rows are reduced to the latest observation per country-year. Local CSVs and the Gini workbook use local readers. The variable description table documents the base loader's measures; WVS metadata is generated separately from its source spreadsheets.

Country names are normalized through `pycountry.countries.lookup` with a small alias map. Unresolved names are omitted; recognized territories can appear. `scripts/create_dataset.py` separately creates an outer-joined historical Parquet file; the website does not read it.

## Current boundaries

- The current snapshot has 29 base measures and 17 WVS indicators. Regression tests require exact equality between stored and questionnaire indicator keys, preventing unused stored indicators.
- Country detail displays value, year, percentile, and fit, but not per-row OWID source URLs.
- The country snapshot must be generated before serving the app. The GitHub Pages workflow regenerates it during deployment.
- `npm run test:wvs` checks WVS source labels, reconstructed means, coverage, and scoring. `npm run build` performs the TypeScript project build and Vite production bundle. The Pages workflow extracts the XLS files, builds the snapshot using the shared WVS merger, and runs the WVS tests before deployment.

## WVS Integration

`scripts/prepare_wvs_data.mjs` reads the supplied XLS tables and includes `surveyPeriod: "2017-2022"`. The shared merger writes the snapshot and coverage audit. Country-specific years remain null; each WVS summary row displays the period in its Year column, including a fallback for older metadata. Work combines work-as-duty with working hours; Military and national defence combines willingness to fight with military spending. The full current area taxonomy is in [WVS.md](WVS.md) and is applied in both scoring and summary grouping.

WVS fit uses scale-normalized distance from country response-share means, without rounding values for scoring. Means are rounded to one decimal for summary display only. All answer strengths, including point allocations, are normalized by the number of answered contributions in their area. Countries must meet 70% coverage by count of answered WVS questions and the 40% overall weighted-data threshold. Coverage information appears only in Methodology. `src/SocialValueQuestion.tsx` renders one-row radios or sliders; `src/domain/socialValues.ts` defines display ordering and area aliases without recoding stored responses. Sources, coverage, and weighting assumptions are documented in [WVS.md](WVS.md).
