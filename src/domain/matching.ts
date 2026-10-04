import type { Country, CountryDataset, MatchResult } from "./country";
import type { Answers, Importance, TargetChoice } from "./questions";
import { importanceOptions, questions, targetOptions } from "./questions";

export const areaDefinitions = [
  { key: "institutions", label: "Democracy & institutions" },
  { key: "equality", label: "Equality & opportunity" },
  { key: "safety", label: "Safety" },
  { key: "wellbeing", label: "Health & wellbeing" },
  { key: "prosperity", label: "Prosperity & work" },
  { key: "environment", label: "Environment & energy" },
  { key: "community", label: "Community & belonging" },
  { key: "services", label: "Public services" },
  { key: "worklife", label: "Work & daily life" },
];

const measureDirections: Record<string, "high" | "low"> = {
  demokratiindex: "high",
  korruption_index: "low",
  gini: "low",
  lönegap: "low",
  andel_kvinnor_arbete: "high",
  mord_percapita: "low",
  "livslängd": "high",
  livstillfredsställelse: "high",
  "suicid/100k": "low",
  gdp_per_capita: "high",
  unemployment_rate: "low",
  co2_percapita: "low",
  pm25_exposure: "low",
  renewable_energy_share: "high",
  share_trust: "high",
  "skolår": "high",
  utbildning_andel_gdp: "high",
  sjukvård_andel_gdp: "high",
  annual_working_hours: "low",
};

const measureLabels: Record<string, string> = {
  demokratiindex: "Electoral democracy",
  korruption_index: "Political corruption index",
  gini: "Income inequality (Gini)",
  lönegap: "Gender wage gap",
  andel_kvinnor_arbete: "Women's work participation relative to men's",
  mord_percapita: "Homicide rate",
  "livslängd": "Life expectancy",
  livstillfredsställelse: "Life satisfaction",
  "suicid/100k": "Suicide rate",
  gdp_per_capita: "GDP per person",
  unemployment_rate: "Unemployment rate",
  co2_percapita: "CO2 emissions per person",
  pm25_exposure: "PM2.5 exposure",
  renewable_energy_share: "Renewable energy share",
  share_trust: "People who say others can be trusted",
  "skolår": "Average years of schooling",
  utbildning_andel_gdp: "Education spending as a share of GDP",
  sjukvård_andel_gdp: "Public health spending as a share of GDP",
  annual_working_hours: "Annual working hours per worker",
  migrant_population_share: "Residents born in another country",
  share_religious: "Population identifying with a religion",
};

const measureUnits: Record<string, string> = {
  demokratiindex: "index (0-1)",
  korruption_index: "index",
  gini: "index (0-1)",
  lönegap: "%",
  andel_kvinnor_arbete: "ratio",
  mord_percapita: "per 100,000 people",
  "livslängd": "years",
  livstillfredsställelse: "scale (0-10)",
  "suicid/100k": "per 100,000 people",
  gdp_per_capita: "international dollars per person",
  unemployment_rate: "% of labour force",
  co2_percapita: "tonnes per person",
  pm25_exposure: "µg/m³",
  renewable_energy_share: "% of primary energy",
  share_trust: "%",
  "skolår": "years",
  utbildning_andel_gdp: "% of GDP",
  sjukvård_andel_gdp: "% of GDP",
  annual_working_hours: "hours per worker",
  migrant_population_share: "%",
  share_religious: "%",
};

const importanceWeight = (answer: string | undefined): number =>
  importanceOptions.find((option) => option.value === answer)?.score ?? 0;

const areaWeightsFromAnswers = (answers: Answers) => {
  const weights: Record<string, number> = {};
  for (const area of areaDefinitions) {
    weights[area.key] = importanceWeight(answers[`priority-${area.key}`]);
  }
  return weights;
};

const chosenTarget = (answer: string | undefined): number | undefined =>
  targetOptions.find((option) => option.value === answer)?.percentile;

type Contribution = { value: number; year: number; score: number; measure: string };

export function scoreCountries(dataset: CountryDataset, answers: Answers): MatchResult[] {
  const areaWeights = areaWeightsFromAnswers(answers);
  const targetedMeasures = new Set(questions.flatMap((question) =>
    question.type === "target"
      && areaWeights[question.area] > 0
      && chosenTarget(answers[question.id]) !== undefined
      ? question.measures
      : [],
  ));
  const activeQuestions = questions.filter((question) => {
    if (question.type === "priority") return areaWeights[question.area] > 0;
    return areaWeights[question.area] > 0 && chosenTarget(answers[question.id]) !== undefined;
  });
  const expectedMeasureKeys = new Set(activeQuestions.flatMap((question) => question.measures));
  if (expectedMeasureKeys.size === 0) return [];

  return dataset.countries
    .map((country) => scoreCountry(country, answers, areaWeights, expectedMeasureKeys, targetedMeasures))
    .filter((result): result is MatchResult => result !== null)
    .sort((left, right) => right.score - left.score || right.coverage - left.coverage)
    .slice(0, 20);
}

function scoreCountry(
  country: Country,
  answers: Answers,
  areaWeights: Record<string, number>,
  expectedMeasureKeys: Set<string>,
  targetedMeasures: Set<string>,
): MatchResult | null {
  const areaContributions = new Map<string, Contribution[]>();
  const usedMeasures = new Set<string>();

  for (const question of questions) {
    const areaWeight = areaWeights[question.area] ?? 0;
    if (areaWeight <= 0) continue;
    const answer = answers[question.id];
    if (question.type === "priority") {
      for (const measure of question.measures) {
        const fact = country.measures[measure];
        if (!fact || usedMeasures.has(measure) || targetedMeasures.has(measure)) continue;
        const direction = measureDirections[measure];
        if (!direction) continue;
        const score = direction === "high" ? fact.percentile : 100 - fact.percentile;
        addContribution(areaContributions, question.area, {
          value: fact.value, year: fact.year, score, measure,
        });
        usedMeasures.add(measure);
      }
      continue;
    }

    const target = chosenTarget(answer);
    const targetMeasure = question.measures[0];
    const fact = country.measures[targetMeasure];
    if (target === undefined || !fact) continue;
    addContribution(areaContributions, question.area, {
      value: fact.value,
      year: fact.year,
      score: Math.max(0, 100 - Math.abs(fact.percentile - target)),
      measure: targetMeasure,
    });
    usedMeasures.add(targetMeasure);
  }

  const areaScores = [...areaContributions.entries()].flatMap(([key, contributions]) => {
    if (!contributions.length) return [];
    return [{
      key,
      label: areaDefinitions.find((area) => area.key === key)?.label ?? key,
      score: contributions.reduce((sum, item) => sum + item.score, 0) / contributions.length,
      weight: areaWeights[key],
    }];
  });
  const totalWeight = areaScores.reduce((sum, area) => sum + area.weight, 0);
  if (!totalWeight) return null;

  const matchedMeasureCount = [...usedMeasures].filter((key) => country.measures[key]).length;
  const coverage = matchedMeasureCount / expectedMeasureKeys.size;
  if (coverage < 0.4 || matchedMeasureCount < 1) return null;

  return {
    country,
    score: areaScores.reduce((sum, area) => sum + area.score * area.weight, 0) / totalWeight,
    coverage,
    areas: areaScores.sort((left, right) => right.score - left.score),
    measureCount: matchedMeasureCount,
  };
}

function addContribution(
  areas: Map<string, Contribution[]>,
  area: string,
  contribution: Contribution,
) {
  const items = areas.get(area) ?? [];
  items.push(contribution);
  areas.set(area, items);
}

export function measureDetails(result: MatchResult, answers: Answers) {
  const targetedMeasures = new Set(questions.flatMap((question) =>
    question.type === "target"
      && areaWeightsFromAnswers(answers)[question.area] > 0
      && chosenTarget(answers[question.id]) !== undefined
      ? question.measures
      : [],
  ));
  return questions.flatMap((question) => {
    if (question.type === "priority" && importanceWeight(answers[question.id]) > 0) {
      return question.measures.flatMap((measure) => {
        const fact = result.country.measures[measure];
        const direction = measureDirections[measure];
        if (!fact || !direction || targetedMeasures.has(measure)) return [];
        return [{
          label: measureLabels[measure] ?? measure,
          unit: measureUnits[measure] ?? "",
          value: fact.value,
          year: fact.year,
          percentile: fact.percentile,
          score: direction === "high" ? fact.percentile : 100 - fact.percentile,
          area: question.areaLabel,
        }];
      });
    }
    if (question.type === "target") {
      const target = chosenTarget(answers[question.id]);
      const measure = question.measures[0];
      const fact = result.country.measures[measure];
      if (target === undefined || !fact || areaWeightsFromAnswers(answers)[question.area] === 0) return [];
      return [{
        label: measureLabels[measure] ?? measure,
        unit: measureUnits[measure] ?? "",
        value: fact.value,
        year: fact.year,
        percentile: fact.percentile,
        score: Math.max(0, 100 - Math.abs(fact.percentile - target)),
        area: question.areaLabel,
      }];
    }
    return [];
  });
}

export const answerSummary = (answer: Importance | TargetChoice | undefined) => answer ?? "skip";