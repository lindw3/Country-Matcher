# Social Values and World Values Survey

## Source and Questionnaire

The Social Values step, headed **Which values are closest to your heart?**, uses all 17 supplied XLS tables in `data/`. The tables contain country response percentages, not individual survey records. Short scales appear as a single horizontal row of native radio circles. Ten-point scales use an integer slider with ten numbered radio positions; source endpoint text appears beneath positions 1 and 10. An untouched slider has no opinion and contributes nothing.

Agreement and yes/no scales are displayed from disagreement/negative to agreement/positive. This is display-only reordering: original response codes and country means are unchanged. Bipolar questions such as left/right and government/individual responsibility retain their named poles; neither pole is declared universally positive.

The project owner identifies the survey period as **2017-2022**. Every WVS summary row displays this period in the **Year** column, not in the footnote beneath the table. Country-specific fieldwork years are not supplied, so `year` remains null rather than being set to the period's end year. Values are labelled **Mean response** and displayed to exactly one decimal. A snapshot generation date is not a survey date.

“Don't know / no opinion” is always a separate, muted choice at the far left, with a divider and extra spacing. Selecting it is equivalent to skipping and contributes nothing to scoring or coverage. Duplicate “Don't mind” responses are not displayed separately. The current technology-future source has only Bad thing and Good thing, displayed in that order. Source labels and codes are retained in the data even when display order changes.

## Country Coverage

The current snapshot has 222 profiles. WVS coverage varies by question:

| Question | Matched Profiles | Profiles Without This Indicator |
| --- | ---: | ---: |
| Housewife as fulfilling as paid work | 65 | 157 |
| Belief in God | 89 | 133 |
| Public video surveillance | 90 | 132 |
| Government versus individual responsibility | 91 | 131 |
| Same-sex couples as parents | 82 | 140 |
| Immigration policy | 64 | 158 |
| Importance of religion | 91 | 131 |
| Income equality versus incentives | 91 | 131 |
| Justifiability of abortion | 91 | 131 |
| Justifiability of casual sex | 87 | 135 |
| Left-right political position | 79 | 143 |
| More emphasis on technology | 65 | 157 |
| Private versus state business ownership | 91 | 131 |
| Environment versus economic growth | 91 | 131 |
| Technology improves life | 64 | 158 |
| Willingness to fight for country | 91 | 131 |
| Work as a duty | 91 | 131 |

91 profiles have at least one WVS indicator. 49 have all 17. If all questions are answered, 91 meet the 70% WVS coverage requirement; the remaining 131 are ineligible. Answering only immigration policy or technology-improves-life restricts this pool to 64 profiles. Other matching requirements may reduce these counts further.

This reduction is substantial, so Social Values remains optional. Coverage thresholds and country counts are explained in Our Methodology, not while answering the quiz. Without scored WVS answers, the WVS coverage restriction is not applied. No missing WVS means are imputed.

`data/wvs_coverage.json` is the generated audit: it records matched names, missing counts, source-to-profile aliases, intentional exclusions, unresolved names, and every profile's available-question count. There are currently no unresolved country names after the aliases below. The extraction fails if a new XLS file lacks a question definition, rather than silently ignoring it.

### Country Name Decisions

| Source Name | Snapshot Name |
| --- | --- |
| Bolivia | Bolivia, Plurinational State of |
| Bosnia Herzegovina | Bosnia and Herzegovina |
| Great Britain | United Kingdom |
| Hong Kong SAR | Hong Kong |
| Iran | Iran, Islamic Republic of |
| Macau SAR | Macao |
| Russia | Russian Federation |
| South Korea | Korea, Republic of |
| Taiwan ROC | Taiwan, Province of China |
| Turkey | Türkiye |
| Venezuela | Venezuela, Bolivarian Republic of |
| Vietnam | Viet Nam |

Northern Ireland is intentionally excluded as a separate regional sample, not silently mapped onto the UK. Where Great Britain and another UK-labelled column compete, Great Britain is preferred. These are geographic approximations: Great Britain is not a complete UK sample. Regional percentages are not pooled, because the files do not provide the sample counts needed to weight that pooling correctly. Other names are retained when they match an existing profile.

## Areas and Weighting

| Area | WVS Questions | Relationship to Existing Indicators |
| --- | --- | --- |
| Religion | Belief in God; importance of religion | Shared with the religious-population ideal |
| Family values | Housewife/paid work | Shared with the family-values ideal's marriage/union and fertility indicators |
| Immigration and openness | Immigration policy | Shared umbrella with the existing migration ideal |
| Technology | More emphasis on technology; technology improves life | Shared with adult generative AI use |
| Energy | No WVS question | Electricity generation per person, energy use per person, and nuclear energy share |
| Climate and environmental priorities | Environment versus growth | Shared with the carbon-emissions priority group |
| LGBT+ | Same-sex couples as parents | Shared with the LGBT+ rights index |
| Income equality | Income equality/incentives | Shared with wage gap, women's relative work participation, and Gini |
| Taxes and government spending | No WVS question | Tax revenue and government-spending rate preferences |
| Political outlook | Government responsibility; business ownership; left-right position | Separate from tax/spending rates |
| Safety | Public video surveillance | Shared with the homicide rate |
| Personal autonomy | Abortion; casual sex | Separate from surveillance |
| Work | Work as a duty | Shared with annual working hours from the ideal-society step |
| Military and national defence | Willingness to fight for country | Shared with the military-spending preference |

All answered contributions are normalized across their shared category: priority indicator groups, WVS questions, ideal statements, and median preferences. A WVS or median answer has strength 1; a substantive ideal statement has strength 1 or 2; a priority group has strength equal to its allocated points. For a category with N answered contributions, each contribution's effective weight is its strength divided by N. Five WVS questions therefore have total weight 1, just like two in another category. Skips, no-opinion responses, and zero-point groups are excluded from N.

For example, a climate area with a 2-point carbon-emissions group, one renewable-energy preference, and one WVS environment question has three contributions. Their effective multipliers are 2/3, 1/3, and 1/3. If the 2-point group were the only contribution in that area, its multiplier would be 2. Priority groups containing multiple statistical measures average those measures first and count once in N. Summary rows are grouped by area, identify priority allocations explicitly, and show these effective multipliers. Missing data reduces the group's effective weight further. The 70% WVS coverage requirement still counts answered WVS questions, not categories.

Life satisfaction is neither extracted nor scored. There is no automatic general score; an entirely unanswered questionnaire does not produce matches.

**LGBT+** and **Income equality** are distinct areas. The healthy-lifestyle ideal uses **Health and wellbeing**; healthcare spending is not included. Religion, Family values, Taxes and government spending, and Political outlook are separate areas. Every answered WVS question is listed in the summary even if its country value is missing. Missing rows display Not available / Not scored and have zero influence; only available data contributes to matching.

## Matching Method

For each question and country, a mean is calculated from the displayed response shares:

$$
\mu = \frac{\sum_k k\,p_k}{\sum_k p_k}
$$

Here $k$ is the source option's position on the response scale and $p_k$ is its percentage share. Non-substantive options are excluded from both numerator and denominator. Missing cells are ignored. Means are calculated from available rounded percentages and renormalized over substantive responses, not from raw respondent counts.

For answer $a$ on a scale from $L$ to $U$, country fit is:

$$
\operatorname{fit} = \max\left(0,100\left(1-\frac{|\mu-a|}{U-L}\right)\right)
$$

For example, mean 6.3 versus answer 6 on a 1-10 scale scores about 96.7. This is an absolute scale-normalized similarity, **not a percentile ranking of preference distances**. Binary answers work as a recoded proportion: mean 1.3 versus answer 1 scores 70. Equal relative differences have equal scores across differently sized scales.

The existing overall 40% weighted-data requirement still applies. In addition, a country must have WVS data for at least 70% of the substantive WVS questions answered. Invalid stored choices, non-substantive source responses, and skips do not activate that requirement.

### Interpretation Limits

- Ordinal scales are treated as equally spaced. This is a modelling approximation, especially for qualitative four- or five-choice answers and the left-right scale across different political systems.
- A country mean hides polarization. The result does not estimate the share of residents who agree with a respondent or the probability of fitting into that society.
- These exports have no sample sizes, standard errors, individual survey weights, or country-specific fieldwork dates. The provided 2017-2022 period is displayed, but the app cannot add uncertainty intervals or age-adjust individual observations.
- Category averaging reduces question-count bias but does not eliminate correlations between categories or replace missing indicators. No causal inference or assumption about an individual's related beliefs is intended.
- WVS eligibility narrows the geography substantially. Skipping the section is appropriate when broader coverage matters more than these attitudinal matches.

## Preparation and Verification

`npm run extract:wvs` reads the spreadsheets into `data/wvs_values.json`. `npm run prepare:wvs` additionally merges them into an existing country snapshot and generates the coverage audit, without downloading OWID again. The merge removes old `wvs-*` entries before rebuilding them, so repeated runs do not accumulate stale indicators.

For a full refresh, extract WVS first and run `python scripts/prepare_country_data.py`. The Python generator builds the base country data, then invokes the same WVS merger. GitHub Pages follows this sequence and runs `npm run test:wvs` before deployment.

The regression tests check all spreadsheet labels, reconstructed means, country coverage, missing survey years, scored-option validation, similarity scores, the 70% threshold, and area weighting. The current extraction has also been independently checked using `xlrd`: all 17 sets of labels and all 1,413 country-question means matched.