import type { Country, CountryDataset, CountryMeasure, MatchResult } from "./country";
import type { Answers, Direction, IdealChoice, MedianChoice } from "./questions";
import {
  idealOptions,
  idealStatements,
  medianOptions,
  medianQuestions,
  pointGroups,
} from "./questions";

const measureLabels: Record<string, string> = {
  livstillfredsställelse: "Life satisfaction",
  electricity_generation_per_capita: "Electricity generation per person",
  energi_percapita: "Energy use per person",
  demokratiindex: "Electoral democracy",
  korruption_index: "Political corruption index",
  lönegap: "Gender wage gap",
  andel_kvinnor_arbete: "Women's work participation relative to men's",
  gini: "Income inequality (Gini)",
  share_trust: "People who say others can be trusted",
  "skolår": "Average years of schooling",
  utbildning_andel_gdp: "Education spending as a share of GDP",
  sjukvård_andel_gdp: "Public health spending as a share of GDP",
  gdp_per_capita: "GDP per person",
  unemployment_rate: "Unemployment rate",
  co2_percapita: "CO2 emissions per person",
  mord_percapita: "Homicide rate",
  tobacco_use_adult_share: "Adult tobacco use",
  alcohol_consumption_per_capita: "Alcohol consumption per person",
  fetma_andel: "Adult obesity prevalence",
  women_married_union_share: "Women aged 15-49 married or in a union",
  barn_per_kvinna: "Children per woman",
  urban_population_share: "Urban population share",
  share_religious: "Population identifying with a religion",
  annual_working_hours: "Annual working hours per worker",
  migrant_population_share: "Residents born in another country",
  generative_ai_adult_share: "Adult generative AI use",
  bistånd_andel_bni: "Foreign aid as a share of GNI",
  skatt_andel_bnp: "Tax revenue as a share of GDP",
  statligautgifter_andel_bnp: "Government spending as a share of GDP",
  military_spending_gdp: "Military spending as a share of GDP",
  renewable_energy_share: "Renewable energy share",
  nuclear_energy_share: "Nuclear energy share",
};

const measureUnits: Record<string, string> = {
  livstillfredsställelse: "scale (0-10)",
  electricity_generation_per_capita: "kWh per person",
  energi_percapita: "kWh per person",
  demokratiindex: "index (0-1)",
  korruption_index: "index",
  lönegap: "%",
  andel_kvinnor_arbete: "ratio",
  gini: "index (0-1)",
  share_trust: "%",
  "skolår": "years",
  utbildning_andel_gdp: "% of GDP",
  sjukvård_andel_gdp: "% of GDP",
  gdp_per_capita: "international dollars per person",
  unemployment_rate: "% of labour force",
  co2_percapita: "tonnes per person",
  mord_percapita: "per 100,000 people",
  tobacco_use_adult_share: "%",
  alcohol_consumption_per_capita: "litres per person",
  fetma_andel: "%",
  women_married_union_share: "%",
  barn_per_kvinna: "children per woman",
  urban_population_share: "%",
  share_religious: "%",
  annual_working_hours: "hours per worker",
  migrant_population_share: "%",
  generative_ai_adult_share: "%",
  bistånd_andel_bni: "% of GNI",
  skatt_andel_bnp: "% of GDP",
  statligautgifter_andel_bnp: "% of GDP",
  military_spending_gdp: "% of GDP",
  renewable_energy_share: "% of primary energy",
  nuclear_energy_share: "% of primary energy",
};

type MedianBand = {
  value: Exclude<MedianChoice, "skip">;
  lower: number | null;
  upper: number | null;
  index: number;
};

type MeasurePreference = {
  key: string;
  direction: Direction;
  band?: MedianBand;
  bandBoundaries?: number[];
};

type ScoreGroup = {
  key: string;
  label: string;
  weight: number;
  measures: MeasurePreference[];
};

export type MeasureDetail = {
  label: string;
  unit: string;
  value: number;
  year: number;
  percentile: number;
  score: number;
  area: string;
};

export type DisplayMedianBand = MedianBand & { label: string };

const percentile = (values: number[], fraction: number) => {
  const position = (values.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return values[lower];
  return values[lower] + (values[upper] - values[lower]) * (position - lower);
};

export function getMedianBands(dataset: CountryDataset, measure: string): {
  median: number;
  unit: string;
  usesSpreadFallback: boolean;
  bands: DisplayMedianBand[];
} | null {
  const values = dataset.countries
    .map((country) => country.measures[measure]?.value)
    .filter((value): value is number => value !== undefined && Number.isFinite(value))
    .sort((left, right) => left - right);
  if (values.length === 0) return null;

  const median = percentile(values, 0.5);
  const usesSpreadFallback = median <= 0;
  const fallbackValues = usesSpreadFallback ? [...new Set(values)] : values;
  const boundaries = usesSpreadFallback
    ? [percentile(fallbackValues, 0.2), percentile(fallbackValues, 0.4), percentile(fallbackValues, 0.6), percentile(fallbackValues, 0.8)]
    : [0.5 * median, 0.75 * median, 1.25 * median, 1.5 * median];
  const question = medianQuestions.find((item) => item.measure === measure);
  const units = question?.unit ?? "";
  const valuesText = (value: number) => {
    const formatted = formatMedianValue(value, question?.displayDecimals ?? 0);
    return `${formatted}${units.startsWith("%") ? "" : " "}${units}`;
  };
  const definitions: DisplayMedianBand[] = [
    { value: "much-lower", label: `Below ${valuesText(boundaries[0])}`, lower: null, upper: boundaries[0], index: 0 },
    { value: "slightly-lower", label: `From ${valuesText(boundaries[0])} to ${valuesText(boundaries[1])}`, lower: boundaries[0], upper: boundaries[1], index: 1 },
    { value: "near-median", label: `From ${valuesText(boundaries[1])} to ${valuesText(boundaries[2])}`, lower: boundaries[1], upper: boundaries[2], index: 2 },
    { value: "slightly-higher", label: `From ${valuesText(boundaries[2])} to ${valuesText(boundaries[3])}`, lower: boundaries[2], upper: boundaries[3], index: 3 },
    { value: "much-higher", label: `Above ${valuesText(boundaries[3])}`, lower: boundaries[3], upper: null, index: 4 },
  ];

  return {
    median,
    unit: units,
    usesSpreadFallback,
    bands: definitions,
  };
}

function medianPreferenceScore(value: number, preference: MeasurePreference) {
  const band = preference.band!;
  const boundaries = preference.bandBoundaries!;
  const countryBandIndex = boundaries.findIndex((boundary) => value < boundary);
  const actualIndex = countryBandIndex === -1 ? boundaries.length : countryBandIndex;
  const stepsAway = Math.abs(actualIndex - band.index);
  return Math.max(0, 100 - stepsAway * 25);
}

function makeScoreGroups(dataset: CountryDataset, answers: Answers): ScoreGroup[] {
  const groups: ScoreGroup[] = [
    {
      key: "general-score",
      label: "General score",
      weight: 1,
      measures: [{ key: "livstillfredsställelse", direction: "high" }],
    },
  ];

  if (!answers.pointsSkipped) {
    for (const group of pointGroups) {
      const weight = answers.points[group.id] ?? 0;
      if (weight > 0) groups.push({ key: `points-${group.id}`, label: group.label, weight, measures: group.measures });
    }
  }

  for (const statement of idealStatements) {
    const choice = answers.ideals[statement.id];
    const multiplier = idealOptions.find((option) => option.value === choice)?.multiplier ?? 0;
    if (multiplier === 0) continue;
    const directionSign = Math.sign(multiplier);
    groups.push({
      key: `ideal-${statement.id}`,
      label: statement.statement,
      weight: Math.abs(multiplier),
      measures: statement.measures.map((measure) => ({
        key: measure.key,
        direction: directionSign > 0
          ? measure.agreeDirection
          : measure.agreeDirection === "high" ? "low" : "high",
      })),
    });
  }

  for (const question of medianQuestions) {
    const choice = answers.medians[question.id];
    if (!choice || choice === "skip") continue;
    const bands = getMedianBands(dataset, question.measure);
    const band = bands?.bands.find((item) => item.value === choice);
    if (!bands || !band) continue;
    groups.push({
      key: `median-${question.id}`,
      label: question.label,
      weight: 1,
      measures: [{
        key: question.measure,
        direction: "high",
        band,
        bandBoundaries: bands.bands.slice(0, -1).map((item) => item.upper!),
      }],
    });
  }

  return groups;
}

function scoreMeasure(fact: CountryMeasure, preference: MeasurePreference) {
  if (preference.band) return medianPreferenceScore(fact.value, preference);
  return preference.direction === "high" ? fact.percentile : 100 - fact.percentile;
}

function scoreCountry(country: Country, groups: ScoreGroup[]): MatchResult | null {
  let weightedScore = 0;
  let effectiveWeight = 0;
  let expectedWeight = 0;
  let coveredWeight = 0;
  const areaScores: MatchResult["areas"] = [];
  const details: MeasureDetail[] = [];
  const matchedMeasures = new Set<string>();

  for (const group of groups) {
    expectedWeight += group.weight;
    const available = group.measures.flatMap((preference) => {
      const fact = country.measures[preference.key];
      if (!fact) return [];
      const score = scoreMeasure(fact, preference);
      details.push({
        label: measureLabels[preference.key] ?? preference.key,
        unit: measureUnits[preference.key] ?? "",
        value: fact.value,
        year: fact.year,
        percentile: fact.percentile,
        score,
        area: group.label,
      });
      matchedMeasures.add(preference.key);
      return [score];
    });
    if (available.length === 0) continue;

    const availableFraction = available.length / group.measures.length;
    const groupWeight = group.weight * availableFraction;
    const groupScore = available.reduce((sum, score) => sum + score, 0) / available.length;
    weightedScore += groupScore * groupWeight;
    effectiveWeight += groupWeight;
    coveredWeight += groupWeight;
    areaScores.push({ key: group.key, label: group.label, score: groupScore, weight: groupWeight });
  }

  const coverage = expectedWeight > 0 ? coveredWeight / expectedWeight : 0;
  if (effectiveWeight === 0 || coverage < 0.4) return null;

  return {
    country,
    score: weightedScore / effectiveWeight,
    coverage,
    areas: areaScores.sort((left, right) => right.score - left.score),
    measureCount: matchedMeasures.size,
    details,
  };
}

export function scoreCountries(dataset: CountryDataset, answers: Answers): MatchResult[] {
  const groups = makeScoreGroups(dataset, answers);
  return dataset.countries
    .map((country) => scoreCountry(country, groups))
    .filter((result): result is MatchResult => result !== null)
    .sort((left, right) => right.score - left.score || right.coverage - left.coverage)
    .slice(0, 20);
}

export function measureDetails(result: MatchResult) {
  return result.details;
}

export function formatValue(value: number) {
  return new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4 }).format(value);
}

export function formatMedianValue(value: number, decimalPlaces: number) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}

export function idealMultiplier(choice: IdealChoice | undefined) {
  return idealOptions.find((option) => option.value === choice)?.multiplier ?? 0;
}

export function medianChoiceLabel(choice: MedianChoice | undefined) {
  return medianOptions.find((option) => option.value === choice)?.label ?? "Skipped";
}