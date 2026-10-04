# Product Overview

Country Matcher is an interactive preference-fit tool. It asks how much several social outcomes matter and, for a few measures, what position the respondent would prefer relative to other countries. It then ranks country profiles against those answers.

The tool is about fit with a person's selected priorities, not a political identity quiz, relocation recommendation, or universal country-quality ranking. Statistical indicators are proxies for complex outcomes and do not describe every resident's experience.

## Current experience

1. **Introduction** explains the purpose, displays the snapshot date and dataset counts, and starts the questionnaire.
2. **Questionnaire** presents twelve prompts one at a time. Nine ask how important an area is; three ask for a preferred position on a measure. The respondent can go back, change answers, or skip every question.
3. **Results** shows the top match, the top three countries, area-fit bars, a fit score, and data coverage. If no usable priorities were answered, the app asks the respondent to review their answers instead of presenting a ranking.
4. **Country breakdown** shows the observed values, years, peer percentiles, and measure-fit values used for that country.
5. **Methodology** explains the scoring concept and its limitations.

The app currently uses in-page state rather than separate URL routes. Answers persist in browser local storage and are not sent to a service.

## Questionnaire

The importance questions cover democracy and institutions, equality and opportunity, safety, health and wellbeing, prosperity and work, environment and energy, community and belonging, public services, and work-life balance. Each has three importance levels:

| Answer | Area weight |
| --- | ---: |
| Essential | 3 |
| Important | 2 |
| Somewhat | 1 |
| Skip this question | 0; excluded |

The three target questions ask about the share of residents born in another country, the share identifying with a religion, and annual working hours per worker. Their choices correspond to target peer percentiles of 10, 30, 50, 70, and 90. A skipped target is omitted. A target only contributes when its area was given a non-zero importance weight.

## What affects a score

The report currently scores a curated subset of the source measures:

| Area | Measures | Current scoring direction |
| --- | --- | --- |
| Democracy & institutions | Electoral democracy (`demokratiindex`); political corruption (`korruption_index`) | Higher democracy and lower corruption-index values score higher. |
| Equality & opportunity | Gini (`gini`); gender wage gap (`lönegap`); women's work participation relative to men's (`andel_kvinnor_arbete`) | Lower Gini and wage-gap values, and higher participation ratios, score higher. |
| Safety | Homicide rate (`mord_percapita`) | Lower values score higher. |
| Health & wellbeing | Life expectancy (`livslängd`); life satisfaction (`livstillfredsställelse`); suicide rate (`suicid/100k`) | Higher life expectancy and life satisfaction, and lower suicide rates, score higher. |
| Prosperity & work | GDP per person (`gdp_per_capita`); unemployment (`unemployment_rate`) | Higher GDP per person and lower unemployment score higher. |
| Environment & energy | CO2 per person (`co2_percapita`); PM2.5 exposure (`pm25_exposure`); renewable energy share (`renewable_energy_share`) | Lower emissions and exposure, and a higher renewable share, score higher. |
| Community & belonging | Self-reported trust (`share_trust`); migration-stock share (`migrant_population_share`); religious-identification share (`share_religious`) | Trust scores higher at higher percentiles. Migration and religion use the respondent's target percentile. |
| Public services | Average schooling (`skolår`); education spending (`utbildning_andel_gdp`); public health spending (`sjukvård_andel_gdp`) | Higher values score higher. Spending is an input measure, not a direct measure of service quality. |
| Work & daily life | Annual working hours (`annual_working_hours`) | Lower hours are the default direction; if the respondent answers the hours target question, the selected target replaces this default. |

All 40 measures returned by `load_data.py` are included in the generated country snapshot, but the following are not currently used to calculate report scores: `fetma_andel`, `hdi`, `energi_percapita`, `bistånd_andel_bni`, `skatt_andel_bnp`, `statligautgifter_andel_bnp`, `handel_andel_gdp`, `barn_per_kvinna`, `död_i_konflikt_percapita`, `women_married_union_share`, `generative_ai_adult_share`, `military_spending_gdp`, `armed_forces_labor_share`, `nuclear_energy_share`, `electricity_generation_per_capita`, `tobacco_use_adult_share`, `alcohol_consumption_per_capita`, `urban_population_share`, and `conflict_deaths`.

These remain available for future analysis. In particular, `conflict_deaths` is an absolute count from the local conflict file, not a per-capita rate, so it is not interchangeable with the separate OWID conflict measure.

## Scoring and coverage

For each direction-based measure, the data preparation step assigns each country a percentile among the countries with a value for that measure. Higher-is-better measures use that percentile as their fit score; lower-is-better measures use its inverse (`100 - percentile`).

For a target answer, the fit score is `max(0, 100 - abs(country percentile - target percentile))`. Thus, a country nearer the chosen position scores higher for that measure.

Within an area, the app averages the available measure-fit scores. It then combines available area scores using the selected importance weights. Missing measures are omitted and the remaining area weights are renormalized for that country. Coverage is the share of distinct active measures for which that country has data. A country needs at least one scored measure and at least 40% coverage to appear in the results. The app sorts eligible countries by score and shows the top three.

Scores and percentiles are rounded for display. Country observations can come from different years; both year and coverage are shown so a high score is not mistaken for complete or same-year evidence.

## Data and limitations

Most series come from OWID Grapher CSVs. Electoral democracy, energy use, Gini, and deaths in conflicts also use local files in `data/`. The marriage/union series deliberately uses the observed estimate column, not the projected series. The generative-AI source has date-level rows and is reduced to its latest observation within each country-year.

The snapshot chooses the latest non-missing observation separately for each country and measure. It does not select one shared year for all countries, apply a maximum age for values, or choose a year based on a coverage-versus-recency threshold. Old observations can therefore remain in the comparison; inspect the displayed year before interpreting a match.

Country names are canonicalized through `pycountry` with a small alias map. The resulting profiles include ISO-recognized territories and other entries as well as sovereign states; the current snapshot is not a sovereign-states-only list. Some source entities will not match the country-name lookup and are omitted.

Scoring directions and proxies are initial product assumptions. Examples include treating public spending as beneficial, treating fewer work hours as preferable unless a target is supplied, and using homicide rates as one safety proxy. Review these assumptions and the source definitions before treating results as policy conclusions.