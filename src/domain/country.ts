export type CountryMeasure = {
  value: number;
  year: number;
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
    value: number;
    year: number;
    percentile: number;
    score: number;
    area: string;
  }[];
};