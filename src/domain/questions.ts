export type Importance = "essential" | "important" | "some" | "skip";
export type TargetChoice = "much-lower" | "lower" | "median" | "higher" | "much-higher" | "skip";
export type Answer = Importance | TargetChoice;
export type Answers = Record<string, Answer>;
export type Question = {
  id: string;
  type: "priority" | "target";
  area: string;
  areaLabel: string;
  title: string;
  detail: string;
  measures: string[];
};

export const questions: Question[] = [
  {
    id: "priority-institutions", type: "priority", area: "institutions", areaLabel: "Democracy & institutions",
    title: "How much should democracy and trustworthy institutions matter?",
    detail: "Electoral democracy and public-sector corruption are broad, imperfect indicators.",
    measures: ["demokratiindex", "korruption_index"],
  },
  {
    id: "priority-equality", type: "priority", area: "equality", areaLabel: "Equality & opportunity",
    title: "How much should equality of opportunity and income matter?",
    detail: "The comparison uses income inequality and gender gaps in wages and work participation.",
    measures: ["gini", "lönegap", "andel_kvinnor_arbete"],
  },
  {
    id: "priority-safety", type: "priority", area: "safety", areaLabel: "Safety",
    title: "How important is a safer everyday life?",
    detail: "Homicide rates are one limited indicator of personal safety.",
    measures: ["mord_percapita"],
  },
  {
    id: "priority-wellbeing", type: "priority", area: "wellbeing", areaLabel: "Health & wellbeing",
    title: "How much should health and life satisfaction count?",
    detail: "Life expectancy, self-reported life satisfaction, and suicide rates are included.",
    measures: ["livslängd", "livstillfredsställelse", "suicid/100k"],
  },
  {
    id: "priority-prosperity", type: "priority", area: "prosperity", areaLabel: "Prosperity & work",
    title: "How much should material prosperity and access to work matter?",
    detail: "GDP per person and unemployment provide a partial picture, not a measure of wealth distribution or job quality.",
    measures: ["gdp_per_capita", "unemployment_rate"],
  },
  {
    id: "priority-environment", type: "priority", area: "environment", areaLabel: "Environment & energy",
    title: "How important are cleaner air and lower-carbon energy?",
    detail: "CO2 emissions, PM2.5 exposure, and renewable energy share are compared.",
    measures: ["co2_percapita", "pm25_exposure", "renewable_energy_share"],
  },
  {
    id: "priority-community", type: "priority", area: "community", areaLabel: "Community & belonging",
    title: "How much should social trust and community matter?",
    detail: "Self-reported trust is one available proxy; it does not capture every dimension of belonging.",
    measures: ["share_trust"],
  },
  {
    id: "priority-services", type: "priority", area: "services", areaLabel: "Public services",
    title: "How much should education and public services matter?",
    detail: "Average schooling and health and education spending are incomplete indicators.",
    measures: ["skolår", "utbildning_andel_gdp", "sjukvård_andel_gdp"],
  },
  {
    id: "priority-worklife", type: "priority", area: "worklife", areaLabel: "Work & daily life",
    title: "How important is the balance between work and time outside work?",
    detail: "Annual working hours per worker are available for many, but not all, countries.",
    measures: ["annual_working_hours"],
  },
  {
    id: "target-migration", type: "target", area: "community", areaLabel: "Community & belonging",
    title: "What level of immigration feels right for a society?",
    detail: "This is the share of residents born in another country. It describes migration history, not current immigration policy.",
    measures: ["migrant_population_share"],
  },
  {
    id: "target-religion", type: "target", area: "community", areaLabel: "Community & belonging",
    title: "What place should religion have in society?",
    detail: "The source estimates the share identifying with any religion; it does not measure religious freedom or practice.",
    measures: ["share_religious"],
  },
  {
    id: "target-hours", type: "target", area: "worklife", areaLabel: "Work & daily life",
    title: "How many working hours should be typical?",
    detail: "Choose your preference relative to other countries, not a precise number of hours.",
    measures: ["annual_working_hours"],
  },
];

export const importanceOptions: { value: Importance; label: string; score: number }[] = [
  { value: "essential", label: "Essential", score: 3 },
  { value: "important", label: "Important", score: 2 },
  { value: "some", label: "Somewhat", score: 1 },
];

export const targetOptions: { value: TargetChoice; label: string; percentile?: number }[] = [
  { value: "much-lower", label: "Much lower", percentile: 10 },
  { value: "lower", label: "A little lower", percentile: 30 },
  { value: "median", label: "Near the middle", percentile: 50 },
  { value: "higher", label: "A little higher", percentile: 70 },
  { value: "much-higher", label: "Much higher", percentile: 90 },
];