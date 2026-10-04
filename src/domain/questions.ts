export type Direction = "high" | "low";
export type IdealChoice = "doesnt-matter" | "disagree-fully" | "disagree-somewhat" | "agree-somewhat" | "agree-fully";
export type MedianChoice = "much-lower" | "slightly-lower" | "near-median" | "slightly-higher" | "much-higher" | "skip";
export type Answers = {
  points: Record<string, number>;
  pointsSkipped: boolean;
  ideals: Record<string, IdealChoice>;
  medians: Record<string, MedianChoice>;
};

export const TOTAL_PRIORITY_POINTS = 10;

export type PointGroup = {
  id: string;
  label: string;
  measures: { key: string; direction: Direction }[];
};

export const pointGroups: PointGroup[] = [
  {
    id: "energy",
    label: "Reliable, abundant energy",
    measures: [
      { key: "electricity_generation_per_capita", direction: "high" },
      { key: "energi_percapita", direction: "high" },
    ],
  },
  {
    id: "institutions",
    label: "Democratic institutions and low corruption",
    measures: [
      { key: "demokratiindex", direction: "high" },
      { key: "korruption_index", direction: "low" },
    ],
  },
  {
    id: "equality",
    label: "Equality and gender opportunity",
    measures: [
      { key: "lönegap", direction: "low" },
      { key: "andel_kvinnor_arbete", direction: "high" },
      { key: "gini", direction: "low" },
    ],
  },
  {
    id: "trust",
    label: "Social trust",
    measures: [{ key: "share_trust", direction: "high" }],
  },
  {
    id: "education",
    label: "Education",
    measures: [
      { key: "skolår", direction: "high" },
      { key: "utbildning_andel_gdp", direction: "high" },
    ],
  },
  {
    id: "health",
    label: "Public healthcare investment",
    measures: [{ key: "sjukvård_andel_gdp", direction: "high" }],
  },
  {
    id: "prosperity",
    label: "Prosperity and employment",
    measures: [
      { key: "gdp_per_capita", direction: "high" },
      { key: "unemployment_rate", direction: "low" },
    ],
  },
  {
    id: "climate",
    label: "Lower carbon emissions",
    measures: [{ key: "co2_percapita", direction: "low" }],
  },
  {
    id: "safety",
    label: "Personal safety",
    measures: [{ key: "mord_percapita", direction: "low" }],
  },
];

export const idealOptions: { value: IdealChoice; label: string; multiplier: number }[] = [
  { value: "doesnt-matter", label: "It doesn't matter", multiplier: 0 },
  { value: "disagree-fully", label: "I don't agree at all", multiplier: -2 },
  { value: "disagree-somewhat", label: "I somewhat disagree", multiplier: -1 },
  { value: "agree-somewhat", label: "I somewhat agree", multiplier: 1 },
  { value: "agree-fully", label: "I agree fully", multiplier: 2 },
];

export type IdealStatement = {
  id: string;
  statement: string;
  measures: { key: string; agreeDirection: Direction }[];
};

export const idealStatements: IdealStatement[] = [
  {
    id: "healthy-lifestyle",
    statement: "A healthy lifestyle is common.",
    measures: [
      { key: "tobacco_use_adult_share", agreeDirection: "low" },
      { key: "alcohol_consumption_per_capita", agreeDirection: "low" },
      { key: "fetma_andel", agreeDirection: "low" },
    ],
  },
  {
    id: "traditional-family",
    statement: "Traditional family values have an important place in society.",
    measures: [
      { key: "women_married_union_share", agreeDirection: "high" },
      { key: "barn_per_kvinna", agreeDirection: "high" },
    ],
  },
  {
    id: "urban-life",
    statement: "A large share of people live in urban areas.",
    measures: [{ key: "urban_population_share", agreeDirection: "high" }],
  },
  {
    id: "religion",
    statement: "Religion has a visible place in society.",
    measures: [{ key: "share_religious", agreeDirection: "high" }],
  },
  {
    id: "work-hours",
    statement: "People have shorter working hours and more time outside work.",
    measures: [{ key: "annual_working_hours", agreeDirection: "low" }],
  },
  {
    id: "migration",
    statement: "A substantial share of residents were born in another country.",
    measures: [{ key: "migrant_population_share", agreeDirection: "high" }],
  },
  {
    id: "generative-ai",
    statement: "AI plays an important role in people's daily lives.",
    measures: [{ key: "generative_ai_adult_share", agreeDirection: "high" }],
  },
];

export type MedianQuestion = {
  id: string;
  label: string;
  medianSentence: string;
  measure: string;
  unit: string;
  displayDecimals: number;
};

export const medianQuestions: MedianQuestion[] = [
  { id: "aid", label: "Foreign aid", medianSentence: "The median country spends about {value} percent of its Gross National Income (GNI) on foreign aid.", measure: "bistånd_andel_bni", unit: "% of GNI", displayDecimals: 2 },
  { id: "tax", label: "Tax revenue", medianSentence: "The median country collects about {value} percent of its Gross Domestic Product (GDP) in taxes.", measure: "skatt_andel_bnp", unit: "% of GDP", displayDecimals: 0 },
  { id: "government-spending", label: "Government spending", medianSentence: "The median country spends about {value} percent of its GDP through government expenditure.", measure: "statligautgifter_andel_bnp", unit: "% of GDP", displayDecimals: 0 },
  { id: "military", label: "Military spending", medianSentence: "The median country spends about {value} percent of its GDP on the military.", measure: "military_spending_gdp", unit: "% of GDP", displayDecimals: 0 },
  { id: "renewable-energy", label: "Renewable energy", medianSentence: "The median country gets about {value} percent of its primary energy from renewable sources.", measure: "renewable_energy_share", unit: "% of primary energy", displayDecimals: 0 },
  { id: "nuclear-energy", label: "Nuclear energy", medianSentence: "The median country gets about {value} percent of its primary energy from nuclear power.", measure: "nuclear_energy_share", unit: "% of primary energy", displayDecimals: 0 },
];

export const medianOptions: { value: Exclude<MedianChoice, "skip">; label: string }[] = [
  { value: "much-lower", label: "Much lower" },
  { value: "slightly-lower", label: "Slightly lower" },
  { value: "near-median", label: "Around the median" },
  { value: "slightly-higher", label: "Slightly higher" },
  { value: "much-higher", label: "Much higher" },
];

export function createEmptyAnswers(): Answers {
  return { points: {}, pointsSkipped: false, ideals: {}, medians: {} };
}