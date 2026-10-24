# Product Overview

Country Matcher compares a respondent's preferences for society with country-level indicators. Results are preference-fit comparisons, not a political identity quiz, relocation recommendation, universal country ranking, or prediction of individual happiness. Indicators are proxies and do not capture every resident's experience.

## Current experience

1. **Introduction** describes the purpose and starts the questionnaire once country data is available.
2. **Questionnaire** has four sections: allocate fifteen priority points, answer ideal-society statements, answer optional Social Values questions from WVS, and select median-relative rate ranges. Respondents can go back or skip preferences. Social Values retains the source answer scales and uses radio circles under “Which values are closest to your heart?”
3. **Results** shows the closest country, a top-three shortlist, area-fit bars, fit score, and weighted coverage. Only answered preferences contribute; there is no automatic general score.
4. **Country breakdown** groups all scored measures under their area headings. Priority allocations are explicitly labelled, and survey means display one decimal, the label “Mean response”, and the survey period 2017-2022.
5. **Methodology** summarizes scoring and data caveats.

The app uses in-page state rather than URL routes. Answers are saved in this browser's local storage under a versioned key; there is no account or server-side answer submission.

## Questionnaire

### 1. Allocate fifteen points

The respondent assigns exactly fifteen integer points across nine groups, including LGBT+ inclusion. All fifteen points may go to one group. The whole section can instead be skipped.

| Group | Measures | Direction scored positively |
| --- | --- | --- |
| Energy | `electricity_generation_per_capita`, `energi_percapita` | Higher values; shared area with nuclear energy |
| Democratic institutions and low corruption | `demokratiindex`, `korruption_index` | Higher democracy; lower corruption-index value |
| Equality and gender opportunity | `lönegap`, `andel_kvinnor_arbete`, `gini` | Lower wage gap and Gini; higher women's-to-men's work participation ratio |
| LGBT+ inclusion | `lgbt_rights` | Higher values |
| Social trust | `share_trust` | Higher values |
| Education | `skolår`, `utbildning_andel_gdp` | Higher values |
| Prosperity and employment | `gdp_per_capita`, `unemployment_rate` | Higher GDP per person; lower unemployment |
| Lower carbon emissions | `co2_percapita` | Lower values |
| Personal safety | `mord_percapita` | Lower values |

Each priority group counts as one contribution to its area. Allocated points supply its raw multiplier, which is divided by the number of answered contributions in that area. A multi-measure priority group averages its available measures first. For example, 2 points among 3 area contributions gives that group an effective multiplier of 2/3 before accounting for missing data. Priority indicators appear in the grouped summary with their allocation and effective influence.

### 2. “My ideal society is characterized by…”

The respondent chooses one of five responses for each statement: “It doesn't matter”, “I don't agree at all”, “I somewhat disagree”, “I somewhat agree”, or “I agree fully”. Statements left unanswered have no effect.

| Statement | Measures | Agreement favors |
| --- | --- | --- |
| A healthy lifestyle is common. | `tobacco_use_adult_share`, `alcohol_consumption_per_capita`, `fetma_andel` | Lower values |
| Traditional family values have an important place in society. | `women_married_union_share`, `barn_per_kvinna` | Higher values |
| Religion has a visible place in society. | `share_religious` | Higher values |
| People have shorter working hours and more time outside work. | `annual_working_hours` | Lower values |
| A substantial share of residents were born in another country. | `migrant_population_share` | Higher values |
| AI plays an important role in people's daily lives. | `generative_ai_adult_share` | Higher values |

The response multipliers are 0 for “It doesn't matter”, -2 for “I don't agree at all”, -1 for “I somewhat disagree”, +1 for “I somewhat agree”, and +2 for “I agree fully”. A positive answer uses the agreement direction; a negative answer reverses it. The absolute multiplier is the group's weight.

### 3. Social Values

All 17 supplied WVS tables are included. Short scales use one row of radio circles; ten-point scales use a slider with labelled endpoints and numbered radio positions. Agreement scales run from negative to positive while preserving original stored codes. Country means are reconstructed from substantive response shares. Fit is 100 times one minus the absolute answer-to-mean distance divided by the scale range. “Don't know / no opinion” is a separate gray choice and is equivalent to skipping: it contributes no weight. Optional responses are averaged by shared category, so question counts do not increase a topic's influence.

Coverage is consequential: 91 of the current 222 profiles have WVS indicators, and 49 have all 17. Coverage information is presented in Our Methodology, not in the quiz. See [WVS.md](WVS.md) for the full area taxonomy and limitations. Survey rows show 2017-2022 in the Year column. Work groups working hours and work-as-duty; Military and national defence groups military spending and willingness to fight. Taxes and government spending is separate from Political outlook; Religion is separate from Family values.

### 4. Median-relative rates

For each measure, the questionnaire calculates the median across countries with a value in the generated snapshot. It displays the median and five absolute value bands with units. For a positive median, band boundaries are:

| Choice | Value band |
| --- | --- |
| Much lower | Below 50% of the median |
| Slightly lower | 50% to 75% of the median |
| Around the median | 75% to 125% of the median |
| Slightly higher | 125% to 150% of the median |
| Much higher | Above 150% of the median |

Each of the five rates is introduced with its median and “How much do you think is appropriate?” Military spending displays one decimal; tax revenue, government spending, renewable energy share, and nuclear energy share display whole percentages. Scoring uses unrounded values. Foreign aid is not included. Any item can be skipped.

If the median is zero or below, relative percentages cannot define useful ranges. The app uses percentile cutoffs across distinct observed values instead, which avoids impossible negative ranges and reduces duplicate boundaries where the data varies. The true median remains visible and the interface identifies this fallback.

## Match calculation

Only answered preferences contribute. Life satisfaction is not extracted or scored, and skipping every preference yields no ranking.

Direction-based measures use their percentile among countries with data. A higher-is-better value scores at its percentile; a lower-is-better value scores at `100 - percentile`. Point groups average their available measure scores and use the points assigned as their weight. Ideal statements use the direction and signed-strength rules above. Median preferences have base strength one before category normalization. Median matching compares the country's band category to the chosen category: same band scores 100, one step away 75, two steps away is neutral at 50, three steps away 25, and four steps away 0. Each band step changes fit by 25 points relative to neutral.

Priority indicator groups, WVS questions, ideal statements, and median preferences all share their area's averaging denominator. Each contribution's strength is divided by the number of answered contributions in that area. Priority strength equals its allocated points; ideal strength is one or two; WVS and median strengths are one. LGBT+ and Income equality are distinct areas; no unexpressed preferences are inferred. Missing indicators reduce effective weight in proportion to availability. Countries need at least 40% weighted coverage and at least 70% coverage by count of answered WVS questions. Results are ordered by score, then coverage; the report shows the top three.

## Indicator Inventory and Summary

The snapshot contains 29 base measures and 17 WVS indicators, all referenced by the questionnaire. No unused indicators are retained. Foreign aid, healthcare spending, life satisfaction, urban population, and the former unused base measures are not extracted.

Every priority indicator and answered preference appears in the grouped summary. Zero-point or skipped priority groups retain available country values but display **Not scored / Excluded**. They do not affect scores, matched-measure counts, area-averaging denominators, or coverage. If country data is missing, the row also displays **Not available**. Missing values are never imputed. Unanswered or skipped non-priority questions do not appear as active preferences.

## Data limitations

Most measures come from OWID Grapher CSVs; local files provide other series. Each country uses its latest non-missing observation for each measure, so a report can combine different years and can include old observations. The marriage/union source uses observed estimates rather than projections. Country names are normalized through `pycountry` and a small alias map; recognized territories may appear alongside sovereign states, while unresolved source entities are omitted.

The score directions are product assumptions. For example, the model currently treats higher energy use/generation and public spending as positive, fewer working hours as agreement with the time-outside-work statement, and greater marriage prevalence/fertility as agreement with the traditional-family statement. These measures do not fully describe the broad social concepts in their question text. Review source definitions and these assumptions before using results as policy conclusions.
