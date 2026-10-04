# Product Overview

Country Matcher compares a respondent's preferences for society with country-level indicators. Results are preference-fit comparisons, not a political identity quiz, relocation recommendation, universal country ranking, or prediction of individual happiness. Indicators are proxies and do not capture every resident's experience.

## Current experience

1. **Introduction** describes the purpose and starts the questionnaire once country data is available.
2. **Questionnaire** has three sections: allocate ten points across shared foundations, describe an ideal society through agreement choices, and select value ranges relative to six measure medians. The respondent can go back, skip the point allocation, choose “It doesn't matter” for an ideal statement, or skip each median item.
3. **Results** shows the closest country, a top-three shortlist, score-group bars, fit score, and weighted data coverage. Life satisfaction always contributes to the general score, including when other preferences are skipped.
4. **Country breakdown** lists the measures used for the country's score, with observed value, unit, year, peer percentile, and fit contribution.
5. **Methodology** summarizes scoring and data caveats.

The app uses in-page state rather than URL routes. Answers are saved in this browser's local storage under a versioned key; there is no account or server-side answer submission.

## Questionnaire

### 1. Allocate ten points

The respondent assigns exactly ten integer points across these nine groups. All ten points may go to one group. The whole section can instead be skipped.

| Group | Measures | Direction scored positively |
| --- | --- | --- |
| Reliable, abundant energy | `electricity_generation_per_capita`, `energi_percapita` | Higher values |
| Democratic institutions and low corruption | `demokratiindex`, `korruption_index` | Higher democracy; lower corruption-index value |
| Equality and gender opportunity | `lönegap`, `andel_kvinnor_arbete`, `gini` | Lower wage gap and Gini; higher women's-to-men's work participation ratio |
| Social trust | `share_trust` | Higher values |
| Education | `skolår`, `utbildning_andel_gdp` | Higher values |
| Public healthcare investment | `sjukvård_andel_gdp` | Higher values |
| Prosperity and employment | `gdp_per_capita`, `unemployment_rate` | Higher GDP per person; lower unemployment |
| Lower carbon emissions | `co2_percapita` | Lower values |
| Personal safety | `mord_percapita` | Lower values |

Each group's measure fit is averaged over the values available for a country. Its allocated points set the group's weight in the overall score.

### 2. “My ideal society is characterized by…”

The respondent chooses one of five responses for each statement: “It doesn't matter”, “I don't agree at all”, “I somewhat disagree”, “I somewhat agree”, or “I agree fully”. Statements left unanswered have no effect.

| Statement | Measures | Agreement favors |
| --- | --- | --- |
| A healthy lifestyle is common. | `tobacco_use_adult_share`, `alcohol_consumption_per_capita`, `fetma_andel` | Lower values |
| Traditional family values have an important place in society. | `women_married_union_share`, `barn_per_kvinna` | Higher values |
| A large share of people live in urban areas. | `urban_population_share` | Higher values |
| Religion has a visible place in society. | `share_religious` | Higher values |
| People have shorter working hours and more time outside work. | `annual_working_hours` | Lower values |
| A substantial share of residents were born in another country. | `migrant_population_share` | Higher values |
| AI plays an important role in people's daily lives. | `generative_ai_adult_share` | Higher values |

The response multipliers are 0 for “It doesn't matter”, -2 for “I don't agree at all”, -1 for “I somewhat disagree”, +1 for “I somewhat agree”, and +2 for “I agree fully”. A positive answer uses the agreement direction; a negative answer reverses it. The absolute multiplier is the group's weight.

### 3. Median-relative rates

For each measure, the questionnaire calculates the median across countries with a value in the generated snapshot. It displays the median and five absolute value bands with units. For a positive median, band boundaries are:

| Choice | Value band |
| --- | --- |
| Much lower | Below 50% of the median |
| Slightly lower | 50% to 75% of the median |
| Around the median | 75% to 125% of the median |
| Slightly higher | 125% to 150% of the median |
| Much higher | Above 150% of the median |

Each rate is introduced in a plain-language sentence that includes its median, followed by “How much do you think is appropriate?” Foreign aid (`bistånd_andel_bni`) is displayed to two decimal places. Tax revenue (`skatt_andel_bnp`), government spending (`statligautgifter_andel_bnp`), military spending (`military_spending_gdp`), renewable energy share (`renewable_energy_share`), and nuclear energy share (`nuclear_energy_share`) are displayed as whole percentages. Scoring uses unrounded medians and boundaries. Any item can be skipped.

If the median is zero or below, relative percentages cannot define useful ranges. The app uses percentile cutoffs across distinct observed values instead, which avoids impossible negative ranges and reduces duplicate boundaries where the data varies. The true median remains visible and the interface identifies this fallback.

## General score and match calculation

Life satisfaction (`livstillfredsställelse`) always contributes to a fixed-weight General score; higher country percentiles score higher. Its fixed weight is 1, separate from the respondent's ten priority points.

Direction-based measures use their percentile among countries with data. A higher-is-better value scores at its percentile; a lower-is-better value scores at `100 - percentile`. Point groups average their available measure scores and use the points assigned as their weight. Ideal statements use the direction and signed-strength rules above. Each answered median preference has weight one. Values inside the selected band score 100; scores decline linearly outside it and reach zero one adjacent-band width beyond the nearest boundary.

All active groups are combined as a weighted average. If some measures in a group are missing, that group's effective weight is reduced in proportion to the available measures. Coverage is the share of expected weighted data available for that country. A country needs at least 40% coverage and some available score weight to appear. Results are ordered by score, with coverage as a tie-breaker; the report displays the top three.

## Measures not currently used

The data snapshot contains all 40 measures loaded by `scripts/load_data.py`. These eight do not currently affect a questionnaire response or score:

- `livslängd`
- `suicid/100k`
- `hdi`
- `handel_andel_gdp`
- `död_i_konflikt_percapita`
- `armed_forces_labor_share`
- `pm25_exposure`
- `conflict_deaths`

The OWID conflict deaths measure and the local `conflict_deaths` series are both unused. The local series is an absolute count, not a per-capita rate.

## Data limitations

Most measures come from OWID Grapher CSVs; local files provide other series. Each country uses its latest non-missing observation for each measure, so a report can combine different years and can include old observations. The marriage/union source uses observed estimates rather than projections. Country names are normalized through `pycountry` and a small alias map; recognized territories may appear alongside sovereign states, while unresolved source entities are omitted.

The score directions are product assumptions. For example, the model currently treats higher energy use/generation and public spending as positive, fewer working hours as agreement with the time-outside-work statement, and greater marriage prevalence/fertility as agreement with the traditional-family statement. These measures do not fully describe the broad social concepts in their question text. Review source definitions and these assumptions before using results as policy conclusions.