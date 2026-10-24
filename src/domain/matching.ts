import type { Country, CountryDataset, CountryMeasure, MatchResult, WvsQuestion } from "./country";
import type { Answers, Direction, IdealChoice, MedianChoice } from "./questions";
import { categoryLabel } from "./socialValues";
import {
  idealOptions,
  idealStatements,
  medianOptions,
  medianQuestions,
  pointGroups,
} from "./questions";

const measureLabels: Record<string, string> = {
  electricity_generation_per_capita: "Electricity generation per person",
  energi_percapita: "Energy use per person",
  demokratiindex: "Electoral democracy",
  korruption_index: "Political corruption index",
  lönegap: "Gender wage gap",
  andel_kvinnor_arbete: "Women's work participation relative to men's",
  lgbt_rights: "LGBT+ rights index",
  gini: "Income inequality (Gini)",
  share_trust: "People who say others can be trusted",
  "skolår": "Average years of schooling",
  utbildning_andel_gdp: "Education spending as a share of GDP",
  gdp_per_capita: "GDP per person",
  unemployment_rate: "Unemployment rate",
  co2_percapita: "CO2 emissions per person",
  mord_percapita: "Homicide rate",
  tobacco_use_adult_share: "Adult tobacco use",
  alcohol_consumption_per_capita: "Alcohol consumption per person",
  fetma_andel: "Adult obesity prevalence",
  women_married_union_share: "Women aged 15-49 married or in a union",
  barn_per_kvinna: "Children per woman",
  share_religious: "Population identifying with a religion",
  annual_working_hours: "Annual working hours per worker",
  migrant_population_share: "Residents born in another country",
  generative_ai_adult_share: "Adult generative AI use",
  skatt_andel_bnp: "Tax revenue as a share of GDP",
  statligautgifter_andel_bnp: "Government spending as a share of GDP",
  military_spending_gdp: "Military spending as a share of GDP",
  renewable_energy_share: "Renewable energy share",
  nuclear_energy_share: "Nuclear energy share",
};

const measureUnits: Record<string, string> = {
  electricity_generation_per_capita: "kWh per person",
  energi_percapita: "kWh per person",
  demokratiindex: "index (0-1)",
  korruption_index: "index",
  lönegap: "%",
  andel_kvinnor_arbete: "ratio",
  lgbt_rights: "index (0-100)",
  gini: "index (0-1)",
  share_trust: "%",
  "skolår": "years",
  utbildning_andel_gdp: "% of GDP",
  gdp_per_capita: "international dollars per person",
  unemployment_rate: "% of labour force",
  co2_percapita: "tonnes per person",
  mord_percapita: "per 100,000 people",
  tobacco_use_adult_share: "%",
  alcohol_consumption_per_capita: "litres per person",
  fetma_andel: "%",
  women_married_union_share: "%",
  barn_per_kvinna: "children per woman",
  share_religious: "%",
  annual_working_hours: "hours per worker",
  migrant_population_share: "%",
  generative_ai_adult_share: "%",
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
  valueQuestion?: WvsQuestion;
  valueChoice?: number;
};

type ScoreGroup = {
  key: string;
  label: string;
  weight: number;
  measures: MeasurePreference[];
  isValueGroup?: boolean;
  priorityPoints?: number;
};

export type MeasureDetail = {
  label: string;
  unit: string;
  value: number | null;
  year: number | null;
  percentile: number | null;
  score: number | null;
  area: string;
  weight: number;
  measureCount: number;
  surveyPeriod?: string;
  valueDecimals?: number;
  priorityLabel?: string;
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

function valuePreferenceScore(value: number, preference: MeasurePreference) {
  const question = preference.valueQuestion!;
  const range = question.maximum - question.minimum;
  if (range <= 0 || preference.valueChoice === undefined) return 0;
  return Math.max(0, 100 * (1 - Math.abs(value - preference.valueChoice) / range));
}

function answeredValueQuestions(dataset: CountryDataset, answers: Answers) {
  return (dataset.wvsQuestions ?? []).filter((question) =>
    question.options.some((option) => option.scored && option.value === answers.values[question.id]),
  );
}

export function valueCoverageSummary(dataset: CountryDataset, answers: Answers) {
  const questions = answeredValueQuestions(dataset, answers);
  const eligible = dataset.countries.filter((country) => {
    if (questions.length === 0) return true;
    const available = questions.filter((question) => country.measures[`wvs-${question.id}`]).length;
    return available / questions.length >= 0.7;
  }).length;
  return { answered: questions.length, eligible, total: dataset.countries.length };
}

function makeScoreGroups(dataset: CountryDataset, answers: Answers): ScoreGroup[] {
  const groups: ScoreGroup[] = [];

  if (!answers.pointsSkipped) {
    for (const group of pointGroups) {
      const weight = answers.points[group.id] ?? 0;
      if (weight > 0) groups.push({ key: `points-${group.id}`, label: group.label, weight, measures: group.measures, priorityPoints: weight });
    }
  }

  for (const statement of idealStatements) {
    const choice = answers.ideals[statement.id];
    const multiplier = idealOptions.find((option) => option.value === choice)?.multiplier ?? 0;
    if (multiplier === 0) continue;
    const directionSign = Math.sign(multiplier);
    groups.push({
      key: `ideal-${statement.id}`,
      label: statement.area ?? statement.statement,
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

  const activeValueQuestions = answeredValueQuestions(dataset, answers);
  const questionsByArea = new Map<string, WvsQuestion[]>();
  for (const question of activeValueQuestions) {
    const inArea = questionsByArea.get(question.area) ?? [];
    inArea.push(question);
    questionsByArea.set(question.area, inArea);
  }
  for (const [area, questions] of questionsByArea) {
    groups.push({
      key: `values-${area.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: area,
      weight: 1,
      isValueGroup: true,
      measures: questions.map((question) => ({
        key: `wvs-${question.id}`,
        direction: "high",
        valueQuestion: question,
        valueChoice: answers.values[question.id] as number,
      })),
    });
  }

  for (const group of pointGroups) {
    if (!answers.pointsSkipped && (answers.points[group.id] ?? 0) > 0) continue;
    groups.push({ key: `points-${group.id}`, label: group.label, weight: 0, measures: group.measures, priorityPoints: 0 });
  }

  for (const group of groups) group.label = categoryLabel(group.label);
  const categoryCounts = new Map<string, number>();
  for (const group of groups) {
    if (group.weight === 0) continue;
    const count = group.isValueGroup ? group.measures.length : 1;
    categoryCounts.set(group.label, (categoryCounts.get(group.label) ?? 0) + count);
  }
  for (const group of groups) {
    if (group.weight === 0) continue;
    const count = group.isValueGroup ? group.measures.length : 1;
    group.weight *= count / categoryCounts.get(group.label)!;
  }

  return groups;
}

function scoreMeasure(fact: CountryMeasure, preference: MeasurePreference) {
  if (preference.band) return medianPreferenceScore(fact.value, preference);
  if (preference.valueQuestion) return valuePreferenceScore(fact.value, preference);
  return preference.direction === "high" ? fact.percentile : 100 - fact.percentile;
}

function scoreCountry(country: Country, groups: ScoreGroup[]): MatchResult | null {
  let weightedScore = 0;
  let effectiveWeight = 0;
  let expectedWeight = 0;
  let coveredWeight = 0;
  let expectedValueWeight = 0;
  let coveredValueWeight = 0;
  const areaScores: MatchResult["areas"] = [];
  const details: MeasureDetail[] = [];
  const matchedMeasures = new Set<string>();

  for (const group of groups) {
    expectedWeight += group.weight;
    if (group.isValueGroup) expectedValueWeight += group.measures.length;
    const groupDetails: Omit<MeasureDetail, "weight" | "measureCount">[] = [];
    const available = group.measures.flatMap((preference) => {
      const fact = country.measures[preference.key];
      const score = fact && group.weight > 0 ? scoreMeasure(fact, preference) : null;
      groupDetails.push({
        label: preference.valueQuestion?.prompt ?? measureLabels[preference.key] ?? preference.key,
        unit: preference.valueQuestion ? `Mean response (${preference.valueQuestion.minimum}–${preference.valueQuestion.maximum})` : measureUnits[preference.key] ?? "",
        surveyPeriod: preference.valueQuestion ? preference.valueQuestion.surveyPeriod ?? "2017-2022" : undefined,
        valueDecimals: preference.valueQuestion ? 1 : undefined,
        priorityLabel: group.priorityPoints !== undefined ? `Priority allocation: ${group.label} (${group.priorityPoints} ${group.priorityPoints === 1 ? "point" : "points"})` : undefined,
        value: fact?.value ?? null,
        year: fact?.year ?? null,
        percentile: fact?.percentile ?? null,
        score,
        area: group.label,
      });
      if (!fact || score === null) return [];
      matchedMeasures.add(preference.key);
      return [score];
    });

    const availableFraction = available.length / group.measures.length;
    const groupWeight = group.weight * availableFraction;
    details.push(...groupDetails.map((detail) => ({
      ...detail,
      weight: detail.value === null ? 0 : groupWeight,
      measureCount: available.length,
    })));
    if (available.length === 0) continue;
    const groupScore = available.reduce((sum, score) => sum + score, 0) / available.length;
    weightedScore += groupScore * groupWeight;
    effectiveWeight += groupWeight;
    coveredWeight += groupWeight;
    if (group.isValueGroup) coveredValueWeight += available.length;
    areaScores.push({ key: group.key, label: group.label, score: groupScore, weight: groupWeight });
  }

  const coverage = expectedWeight > 0 ? coveredWeight / expectedWeight : 0;
  const valueCoverage = expectedValueWeight > 0 ? coveredValueWeight / expectedValueWeight : 1;
  if (effectiveWeight === 0 || coverage < 0.4 || valueCoverage < 0.7) return null;

  const combinedAreas = new Map<string, { key: string; label: string; weightedScore: number; weight: number }>();
  for (const area of areaScores) {
    const existing = combinedAreas.get(area.label);
    if (existing) {
      existing.weightedScore += area.score * area.weight;
      existing.weight += area.weight;
    } else {
      combinedAreas.set(area.label, { key: area.key, label: area.label, weightedScore: area.score * area.weight, weight: area.weight });
    }
  }

  return {
    country,
    score: weightedScore / effectiveWeight,
    coverage,
    areas: [...combinedAreas.values()]
      .map((area) => ({ key: area.key, label: area.label, score: area.weightedScore / area.weight, weight: area.weight }))
      .sort((left, right) => right.score - left.score),
    measureCount: matchedMeasures.size,
    details: [...new Set(groups.map((group) => group.label))].flatMap((area) => details.filter((detail) => detail.area === area)),
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
