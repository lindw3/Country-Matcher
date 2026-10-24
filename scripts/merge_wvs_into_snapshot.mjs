import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = path.join(ROOT, "public", "data", "countries.json");
const valuesPath = path.join(ROOT, "data", "wvs_values.json");
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
const wvs = JSON.parse(fs.readFileSync(valuesPath, "utf8"));
const countries = new Map(snapshot.countries.map((country) => [country.name, country]));
for (const country of countries.values()) {
  for (const key of Object.keys(country.measures)) {
    if (key.startsWith("wvs-")) delete country.measures[key];
  }
}

const questionCoverage = [];

for (const question of wvs.questions) {
  const entries = Object.entries(question.countries)
    .filter(([country]) => countries.has(country))
    .map(([country, response]) => ({ country, value: response.value }))
    .sort((left, right) => left.value - right.value);
  questionCoverage.push({
    id: question.id,
    file: question.file,
    area: question.area,
    sourceCountries: question.sourceCountries,
    remapped: question.sourceCountries.filter((item) => item.country && item.sourceCountry !== item.country),
    excluded: question.sourceCountries.filter((item) => !item.country),
    unmatched: question.sourceCountries.filter((item) => item.country && !countries.has(item.country)),
    matchedCountries: entries.length,
    profilesWithoutIndicator: countries.size - entries.length,
    matchedNames: entries.map((entry) => entry.country).sort(),
  });
  for (let index = 0; index < entries.length;) {
    let end = index + 1;
    while (end < entries.length && entries[end].value === entries[index].value) end += 1;
    const percentile = (((index + 1) + end) / 2 / entries.length) * 100;
    for (let item = index; item < end; item += 1) {
      countries.get(entries[item].country).measures[`wvs-${question.id}`] = {
        value: Number(entries[item].value.toFixed(4)),
        year: question.year ?? null,
        percentile: Number(percentile.toFixed(2)),
      };
    }
    index = end;
  }
}

snapshot.wvsQuestions = wvs.questions.map(({ countries: _countries, sourceCountries: _sourceCountries, ...question }) => question);
snapshot.measureCount = new Set(snapshot.countries.flatMap((country) => Object.keys(country.measures))).size;
const profileCoverage = snapshot.countries.map((country) => ({
  name: country.name,
  available: wvs.questions.filter((question) => country.measures[`wvs-${question.id}`]).length,
}));
const coverage = {
  profileCount: countries.size,
  questionCount: wvs.questions.length,
  anyIndicator: profileCoverage.filter((country) => country.available > 0).length,
  allIndicators: profileCoverage.filter((country) => country.available === wvs.questions.length).length,
  eligibleWhenAllAnswered: profileCoverage.filter((country) => country.available / wvs.questions.length >= 0.7).length,
  questions: questionCoverage,
  profiles: profileCoverage,
};
fs.writeFileSync(path.join(ROOT, "data", "wvs_coverage.json"), `${JSON.stringify(coverage, null, 2)}\n`);
fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot)}\n`);
console.log(`Updated ${path.relative(ROOT, snapshotPath)} with ${wvs.questions.length} WVS questions.`);
console.log(`WVS coverage: ${coverage.anyIndicator}/${coverage.profileCount} profiles have any data; ${coverage.allIndicators} have every item; ${coverage.eligibleWhenAllAnswered} meet 70% when all items are answered.`);
