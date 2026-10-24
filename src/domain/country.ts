export type CountryMeasure = {
  value: number;
  year: number | null;
  percentile: number;
};

export type Country = {
  name: string;
  measures: Record<string, CountryMeasure>;
};

export type CountryDataset = {
  generatedAt: string;
  countryCount: number;
  measureCount: number;
  countries: Country[];
  wvsQuestions?: WvsQuestion[];
};

export type WvsOption = {
  value: number;
  label: string;
  scored: boolean;
};

export type WvsQuestion = {
  id: string;
  prompt: string;
  area: string;
  source: string;
  file: string;
  surveyPeriod?: string;
  options: WvsOption[];
  minimum: number;
  maximum: number;
};

export type MatchResult = {
  country: Country;
  score: number;
  coverage: number;
  areas: { key: string; label: string; score: number; weight: number }[];
  measureCount: number;
  details: {
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
  }[];
};
