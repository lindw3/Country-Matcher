import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { build } from "esbuild";
import { readXls } from "../scripts/read_wvs_xls.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const extracted = readJson("data/wvs_values.json");
const snapshot = readJson("public/data/countries.json");
const audit = readJson("data/wvs_coverage.json");
const compiled = await build({
  entryPoints: [path.join(root, "src/domain/matching.ts")],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const { scoreCountries, valueCoverageSummary } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const displayCompiled = await build({
  entryPoints: [path.join(root, "src/domain/socialValues.ts")], bundle: true, write: false, platform: "node", format: "esm",
});
const { socialValueOptions, isTenPointScale, categoryLabel } = await import(
  `data:text/javascript;base64,${Buffer.from(displayCompiled.outputFiles[0].text).toString("base64")}`
);
const questionCompiled = await build({
  entryPoints: [path.join(root, "src/domain/questions.ts")], bundle: true, write: false, platform: "node", format: "esm",
});
const { pointGroups, idealStatements, medianQuestions } = await import(
  `data:text/javascript;base64,${Buffer.from(questionCompiled.outputFiles[0].text).toString("base64")}`
);
const matchingKeys = () => [...new Set([
  ...pointGroups.flatMap((group) => group.measures.map((measure) => measure.key)),
  ...idealStatements.flatMap((statement) => statement.measures.map((measure) => measure.key)),
  ...medianQuestions.map((item) => item.measure),
  ...snapshot.wvsQuestions.map((item) => `wvs-${item.id}`),
])];
const emptyAnswers = () => ({ points: {}, pointsSkipped: true, ideals: {}, medians: {}, values: {} });
const fact = (value) => ({ value, year: null, percentile: 50 });
const question = (id, area = "Technology attitudes") => ({
  id, area, prompt: id, source: "Test", file: "test.xls", minimum: 1, maximum: 10,
  options: [
    ...Array.from({ length: 10 }, (_, index) => ({ value: index + 1, label: String(index + 1), scored: true })),
    { value: 11, label: "Don't know", scored: false },
  ],
});
const dataset = (questions, countries) => ({ generatedAt: "test", measureCount: questions.length, countryCount: countries.length, countries, wvsQuestions: questions });

test("every supplied XLS is represented and answer labels exactly match its table", () => {
  const files = fs.readdirSync(path.join(root, "data")).filter((file) => file.endsWith(".xls")).sort();
  assert.deepEqual(extracted.questions.map((item) => item.file).sort(), files);
  for (const item of extracted.questions) {
    const [header, ...rows] = readXls(path.join(root, "data", item.file))[0].rows;
    assert.deepEqual(item.options.map((option) => option.label), rows.map((row) => String(row[0] ?? "")));
    assert.deepEqual(item.sourceCountries.map((entry) => entry.sourceCountry), header.slice(2).filter(Boolean));
    assert.equal(item.year, null);
    assert.equal(item.surveyPeriod, "2017-2022");
    const publicQuestion = snapshot.wvsQuestions.find((candidate) => candidate.id === item.id);
    assert.deepEqual(publicQuestion.options, item.options);
  }
});

test("all country means reproduce the source shares, excluding non-substantive options", () => {
  for (const item of extracted.questions) {
    const [header, ...rows] = readXls(path.join(root, "data", item.file))[0].rows;
    for (const response of Object.values(item.countries)) {
      const column = header.indexOf(response.sourceCountry);
      assert.ok(column >= 2);
      let weightedTotal = 0;
      let substantiveShare = 0;
      for (const option of item.options.filter((candidate) => candidate.scored)) {
        const share = rows[option.value - 1][column];
        if (typeof share !== "number" || !Number.isFinite(share)) continue;
        weightedTotal += option.value * share;
        substantiveShare += share;
      }
      assert.ok(Math.abs(response.value - weightedTotal / substantiveShare) < 1e-10);
    }
  }
});

test("coverage report reconciles to the snapshot without unresolved country names", () => {
  assert.equal(audit.profileCount, snapshot.countries.length);
  assert.equal(audit.questionCount, extracted.questions.length);
  for (const item of audit.questions) {
    assert.deepEqual(item.unmatched, []);
    assert.equal(item.matchedCountries + item.profilesWithoutIndicator, audit.profileCount);
    assert.equal(snapshot.countries.filter((country) => country.measures[`wvs-${item.id}`]).length, item.matchedCountries);
  }
  for (const country of snapshot.countries) {
    for (const [key, value] of Object.entries(country.measures)) {
      if (key.startsWith("wvs-")) assert.equal(value.year, null);
    }
  }
  const answers = emptyAnswers();
  for (const item of snapshot.wvsQuestions) answers.values[item.id] = item.minimum;
  assert.equal(valueCoverageSummary(snapshot, answers).eligible, audit.eligibleWhenAllAnswered);
  assert.equal(valueCoverageSummary(snapshot, emptyAnswers()).eligible, audit.profileCount);
});

test("closer country means score higher using scale-normalized distance", () => {
  const item = question("technology");
  const data = dataset([item], [
    { name: "Close", measures: { "wvs-technology": fact(6.3) } },
    { name: "Far", measures: { "wvs-technology": fact(10) } },
  ]);
  const answers = emptyAnswers();
  answers.values.technology = 6;
  const results = scoreCountries(data, answers);
  assert.equal(results[0].country.name, "Close");
  assert.ok(Math.abs(results[0].score - 100 * (1 - 0.3 / 9)) < 1e-10);
});

test("source Don't know, explicit skips and invalid choices do not activate WVS restrictions", () => {
  const data = dataset([question("technology")], [{ name: "No WVS", measures: { co2_percapita: fact(5) } }]);
  for (const choice of [11, "skip", 999]) {
    const answers = emptyAnswers();
    answers.pointsSkipped = false;
    answers.points.climate = 1;
    answers.values.technology = choice;
    assert.equal(valueCoverageSummary(data, answers).answered, 0);
    assert.equal(scoreCountries(data, answers).length, 1);
  }
});

test("70% WVS coverage passes and 60% fails even with other country data", () => {
  const questions = Array.from({ length: 10 }, (_, index) => question(`item-${index}`));
  const countries = [7, 6].map((available) => ({
    name: `Coverage ${available}`,
    measures: Object.fromEntries([
      ["co2_percapita", fact(5)],
      ...questions.slice(0, available).map((item) => [`wvs-${item.id}`, fact(6)]),
    ]),
  }));
  const answers = emptyAnswers();
  for (const item of questions) answers.values[item.id] = 6;
  const data = dataset(questions, countries);
  assert.equal(valueCoverageSummary(data, answers).eligible, 1);
  assert.deepEqual(scoreCountries(data, answers).map((country) => country.country.name), ["Coverage 7"]);
});

test("two answered questions in one area share one category weight", () => {
  const questions = [question("first"), question("second")];
  const data = dataset(questions, [{ name: "Complete", measures: { "wvs-first": fact(6), "wvs-second": fact(6) } }]);
  const answers = emptyAnswers();
  answers.values = { first: 6, second: 6 };
  const result = scoreCountries(data, answers)[0];
  assert.equal(result.areas[0].weight, 1);
  assert.equal(result.areas[0].score, 100);
});

test("repeating questions in one category does not increase its influence", () => {
  const run = (count) => {
    const questions = [
      ...Array.from({ length: count }, (_, index) => question(`equality-${index}`, "Equality and inclusion")),
      question("technology-first"), question("technology-second"),
    ];
    const answers = emptyAnswers();
    const measures = {};
    for (const item of questions) {
      answers.values[item.id] = 1;
      measures[`wvs-${item.id}`] = fact(item.area === "Equality and inclusion" ? 10 : 1);
    }
    return scoreCountries(dataset(questions, [{ name: "Country", measures }]), answers)[0];
  };
  assert.equal(run(1).score, run(5).score);
  assert.equal(run(5).areas.find((area) => area.label === "Equality and inclusion").weight, 1);
});

test("related ideals and WVS responses share a mean category weight", () => {
  const questions = [question("first"), question("second")];
  const answers = emptyAnswers();
  answers.values = { first: 6, second: 6 };
  answers.ideals = { "generative-ai": "agree-somewhat" };
  const result = scoreCountries(dataset(questions, [{ name: "Country", measures: {
    "wvs-first": fact(6), "wvs-second": fact(6), generative_ai_adult_share: fact(50),
  } }]), answers)[0];
  assert.equal(result.areas.length, 1);
  assert.equal(result.areas[0].weight, 1);
  assert.equal(categoryLabel("LGBT+ inclusion"), "LGBT+");
  assert.equal(categoryLabel("Equality and gender opportunity"), "Income equality");
});

test("negative-to-positive display preserves original WVS response codes", () => {
  for (const id of ["housewife-fulfilling", "same-sex-parents", "work-duty"]) {
    const item = snapshot.wvsQuestions.find((candidate) => candidate.id === id);
    const ordered = socialValueOptions(item);
    assert.match(ordered[0].label, /disagree/i);
    assert.match(ordered.at(-1).label, /agree/i);
    assert.ok(ordered[0].value > ordered.at(-1).value);
    assert.deepEqual(ordered.map((option) => option.value).sort(), item.options.filter((option) => option.scored).map((option) => option.value).sort());
  }
  const item = snapshot.wvsQuestions.find((candidate) => candidate.id === "technology-improves-life");
  assert.equal(isTenPointScale(item), true);
  assert.match(socialValueOptions(item)[0].label, /disagree/i);
  assert.match(socialValueOptions(item).at(-1).label, /agree/i);
});

test("technology future has only bad/good substantive choices and a weightless skip", () => {
  const item = snapshot.wvsQuestions.find((candidate) => candidate.id === "technology-future");
  assert.deepEqual(socialValueOptions(item).map((option) => option.label), ["Bad thing", "Good thing"]);
  const answers = emptyAnswers();
  answers.values[item.id] = "skip";
  assert.equal(valueCoverageSummary(snapshot, answers).answered, 0);
});

test("priority allocation shares its category denominator with other indicators", () => {
  const item = question("environment", "Climate and environmental priorities");
  const data = dataset([item], [{ name: "Climate example", measures: {
    co2_percapita: fact(10), renewable_energy_share: fact(100), "wvs-environment": fact(6),
  } }]);
  const answers = emptyAnswers();
  answers.pointsSkipped = false;
  answers.points.climate = 2;
  answers.medians["renewable-energy"] = "near-median";
  answers.values.environment = 6;
  const result = scoreCountries(data, answers)[0];
  const priority = result.details.find((detail) => detail.priorityLabel);
  assert.ok(Math.abs(priority.weight - 2 / 3) < 1e-10);
  assert.match(priority.priorityLabel, /2 points/);
  assert.equal(result.score, 75);
  assert.ok(Math.abs(result.areas[0].weight - 4 / 3) < 1e-10);

  answers.points.climate = 3;
  const stronger = scoreCountries(data, answers)[0];
  assert.equal(stronger.details.find((detail) => detail.priorityLabel).weight, 1);
  assert.equal(stronger.score, 70);
});

test("summary evidence is contiguous by area and includes priority contributions", () => {
  const item = question("environment", "Climate and environmental priorities");
  const data = dataset([item], [{ name: "Grouped", measures: {
    co2_percapita: fact(10), electricity_generation_per_capita: fact(20), energi_percapita: fact(30),
    renewable_energy_share: fact(100), "wvs-environment": fact(6),
  } }]);
  const answers = emptyAnswers();
  answers.pointsSkipped = false;
  answers.points = { climate: 2, energy: 1 };
  answers.values.environment = 6;
  answers.medians["renewable-energy"] = "near-median";
  const result = scoreCountries(data, answers)[0];
  const blocks = result.details.filter((detail, index, all) => index === 0 || detail.area !== all[index - 1].area).map((detail) => detail.area);
  assert.equal(new Set(blocks).size, blocks.length);
  assert.equal(result.details.filter((detail) => detail.priorityLabel && detail.weight > 0).length, 3);
});

test("survey summary carries its period, one decimal precision and plain mean label", () => {
  const item = { ...question("survey"), surveyPeriod: "2017-2022" };
  const answers = emptyAnswers();
  answers.values.survey = 6;
  const result = scoreCountries(dataset([item], [{ name: "Survey", measures: { "wvs-survey": fact(6.32) } }]), answers)[0];
  assert.equal(result.details[0].surveyPeriod, "2017-2022");
  assert.equal(result.details[0].valueDecimals, 1);
  assert.equal(result.details[0].unit, "Mean response (1–10)");
  assert.equal(result.details[0].value, 6.32);
});

test("work and defence indicators use the requested separate areas", () => {
  assert.equal(snapshot.wvsQuestions.find((item) => item.id === "work-duty").area, "Work");
  assert.equal(snapshot.wvsQuestions.find((item) => item.id === "fight-country").area, "Military and national defence");
  assert.equal(categoryLabel("Military spending"), "Military and national defence");
  const item = question("work-duty", "Work");
  const answers = emptyAnswers();
  answers.values["work-duty"] = 6;
  answers.ideals["work-hours"] = "agree-somewhat";
  const result = scoreCountries(dataset([item], [{ name: "Work", measures: {
    "wvs-work-duty": fact(6), annual_working_hours: fact(1000),
  } }]), answers)[0];
  assert.equal(result.areas.length, 1);
  assert.equal(result.areas[0].label, "Work");
  assert.equal(result.details.filter((detail) => detail.area === "Work").length, 2);
});

test("life satisfaction alone no longer produces a match", () => {
  const data = dataset([], [{ name: "Unanswered", measures: { "livstillfredsställelse": fact(5) } }]);
  assert.deepEqual(scoreCountries(data, emptyAnswers()), []);
  for (const country of snapshot.countries) assert.equal(country.measures["livstillfredsställelse"], undefined);
});

test("source questions use the requested summary taxonomy", () => {
  const expected = {
    "work-duty": "Work",
    "fight-country": "Military and national defence",
    "government-responsibility": "Political outlook",
    "left-right": "Political outlook",
    "state-ownership": "Political outlook",
    "technology-improves-life": "Technology",
    "technology-future": "Technology",
    "same-sex-parents": "LGBT+",
    "income-equality": "Income equality",
    "public-surveillance": "Safety",
    "believe-god": "Religion",
    "religion-important": "Religion",
    "housewife-fulfilling": "Family values",
  };
  for (const [id, area] of Object.entries(expected)) {
    assert.equal(snapshot.wvsQuestions.find((item) => item.id === id).area, area, id);
  }
});

test("summary groups statistical, ideal, policy and survey indicators together", () => {
  const answers = emptyAnswers();
  answers.pointsSkipped = false;
  answers.points = { equality: 5, lgbt: 5, safety: 5 };
  answers.ideals = { "work-hours": "agree-somewhat", "generative-ai": "agree-somewhat", religion: "agree-somewhat", "traditional-family": "agree-somewhat" };
  answers.medians = { tax: "near-median", "government-spending": "near-median", military: "near-median" };
  const measures = {};
  for (const item of snapshot.wvsQuestions) {
    answers.values[item.id] = item.minimum;
    measures[`wvs-${item.id}`] = fact(item.minimum);
  }
  const expected = {
    "Annual working hours per worker": ["annual_working_hours", "Work"],
    "Military spending as a share of GDP": ["military_spending_gdp", "Military and national defence"],
    "Tax revenue as a share of GDP": ["skatt_andel_bnp", "Taxes and government spending"],
    "Government spending as a share of GDP": ["statligautgifter_andel_bnp", "Taxes and government spending"],
    "Adult generative AI use": ["generative_ai_adult_share", "Technology"],
    "LGBT+ rights index": ["lgbt_rights", "LGBT+"],
    "Gender wage gap": ["lönegap", "Income equality"],
    "Women's work participation relative to men's": ["andel_kvinnor_arbete", "Income equality"],
    "Income inequality (Gini)": ["gini", "Income equality"],
    "Homicide rate": ["mord_percapita", "Safety"],
    "Population identifying with a religion": ["share_religious", "Religion"],
    "Women aged 15-49 married or in a union": ["women_married_union_share", "Family values"],
    "Children per woman": ["barn_per_kvinna", "Family values"],
  };
  for (const [key] of Object.values(expected)) measures[key] = fact(1);
  const result = scoreCountries(dataset(snapshot.wvsQuestions, [{ name: "All areas", measures }]), answers)[0];
  for (const [label, [, area]] of Object.entries(expected)) {
    assert.equal(result.details.find((item) => item.label === label)?.area, area, label);
  }
  const blocks = result.details.filter((item, index, all) => index === 0 || item.area !== all[index - 1].area).map((item) => item.area);
  assert.equal(new Set(blocks).size, blocks.length);
});

test("WVS period is available for the Year column even with older question metadata", () => {
  const item = question("older-source");
  const answers = emptyAnswers();
  answers.values[item.id] = 6;
  const result = scoreCountries(dataset([item], [{ name: "Older metadata", measures: { "wvs-older-source": fact(6) } }]), answers)[0];
  assert.equal(result.details[0].surveyPeriod, "2017-2022");
});

test("electricity generation and energy use share Energy with nuclear energy", () => {
  assert.equal(categoryLabel("Reliable, abundant energy"), "Energy");
  assert.equal(categoryLabel("Nuclear energy"), "Energy");
  const answers = emptyAnswers();
  answers.pointsSkipped = false;
  answers.points.energy = 2;
  answers.medians["nuclear-energy"] = "near-median";
  const result = scoreCountries(dataset([], [{ name: "Energy", measures: {
    electricity_generation_per_capita: fact(100), energi_percapita: fact(200), nuclear_energy_share: fact(10),
  } }]), answers)[0];
  assert.equal(result.areas.length, 1);
  assert.equal(result.areas[0].label, "Energy");
  assert.equal(result.details.filter((detail) => detail.area === "Energy").length, 3);
  assert.ok(result.details.filter((detail) => detail.score !== null).every((item) => item.area === "Energy"));
});

test("urban population is absent from the generated dataset", () => {
  for (const country of snapshot.countries) assert.equal(country.measures.urban_population_share, undefined);
});

test("stored indicator inventory exactly equals the questionnaire indicator inventory", () => {
  const stored = [...new Set(snapshot.countries.flatMap((country) => Object.keys(country.measures)))].sort();
  assert.deepEqual(stored, matchingKeys().sort());
  assert.equal(snapshot.measureCount, stored.length);
  assert.equal(pointGroups.some((group) => group.id === "health"), false);
  assert.equal(medianQuestions.some((item) => item.id === "aid"), false);
});

test("all four sparse WVS indicators remain visible as unscored missing rows", () => {
  const missing = new Set(["technology-improves-life", "technology-future", "immigration-policy", "housewife-fulfilling"]);
  const answers = emptyAnswers();
  const measures = {};
  for (const item of snapshot.wvsQuestions) {
    answers.values[item.id] = item.minimum;
    if (!missing.has(item.id)) measures[`wvs-${item.id}`] = fact(item.minimum);
  }
  const result = scoreCountries(dataset(snapshot.wvsQuestions, [{ name: "Missing four", measures }]), answers)[0];
  assert.equal(result.details.filter((detail) => detail.valueDecimals === 1).length, snapshot.wvsQuestions.length);
  for (const item of snapshot.wvsQuestions.filter((candidate) => missing.has(candidate.id))) {
    const detail = result.details.find((candidate) => candidate.label === item.prompt);
    assert.equal(detail.area, item.area);
    assert.equal(detail.value, null);
    assert.equal(detail.score, null);
    assert.equal(detail.weight, 0);
  }
  assert.equal(result.score, 100);
});

test("every matching indicator appears in a fully answered summary", () => {
  const answers = emptyAnswers();
  answers.pointsSkipped = false;
  for (const [index, group] of pointGroups.entries()) answers.points[group.id] = index === 0 ? 15 - (pointGroups.length - 1) : 1;
  for (const statement of idealStatements) answers.ideals[statement.id] = "agree-somewhat";
  for (const item of medianQuestions) answers.medians[item.id] = "near-median";
  for (const item of snapshot.wvsQuestions) answers.values[item.id] = item.minimum;
  const keys = matchingKeys();
  const measures = Object.fromEntries(keys.map((key) => [key, fact(1)]));
  const result = scoreCountries(dataset(snapshot.wvsQuestions, [{ name: "All indicators", measures }]), answers)[0];
  assert.equal(result.measureCount, keys.length);
  assert.equal(result.details.length, keys.length);
  assert.equal(result.coverage, 1);
  assert.equal(new Set(result.details.map((detail) => detail.label)).size, keys.length);
});

test("zero-point priority measures remain visible without affecting scoring or coverage", () => {
  const answers = emptyAnswers();
  answers.pointsSkipped = false;
  answers.points = { climate: 15, equality: 0 };
  const measures = {
    co2_percapita: fact(10), "lönegap": fact(7), andel_kvinnor_arbete: fact(90), gini: fact(0.3),
  };
  const result = scoreCountries(dataset([], [{ name: "Zero points", measures }]), answers)[0];
  const baseline = scoreCountries(dataset([], [{ name: "Zero points", measures: { co2_percapita: measures.co2_percapita } }]), answers)[0];
  const equality = result.details.filter((detail) => detail.area === "Income equality");
  assert.equal(equality.length, 3);
  for (const detail of equality) {
    assert.notEqual(detail.value, null);
    assert.equal(detail.score, null);
    assert.equal(detail.weight, 0);
    assert.match(detail.priorityLabel, /0 points/);
  }
  assert.equal(result.score, baseline.score);
  assert.equal(result.coverage, baseline.coverage);
  assert.equal(result.measureCount, 1);
  assert.equal(result.areas.some((area) => area.label === "Income equality"), false);
});

test("a zero-point priority does not dilute another answer in the same area", () => {
  const item = question("income", "Income equality");
  const answers = emptyAnswers();
  answers.pointsSkipped = false;
  answers.points = { climate: 15, equality: 0 };
  answers.values.income = 6;
  const result = scoreCountries(dataset([item], [{ name: "Shared area", measures: {
    co2_percapita: fact(10), "wvs-income": fact(6), "lönegap": fact(7), andel_kvinnor_arbete: fact(90), gini: fact(0.3),
  } }]), answers)[0];
  const area = result.areas.find((candidate) => candidate.label === "Income equality");
  assert.equal(area.score, 100);
  assert.equal(area.weight, 1);
  assert.equal(result.coverage, 1);
});

test("skipped priority allocation remains visible without activating priority weights", () => {
  const item = question("technology");
  const answers = emptyAnswers();
  answers.points.energy = 15;
  answers.values.technology = 6;
  const result = scoreCountries(dataset([item], [{ name: "Skipped priorities", measures: {
    "wvs-technology": fact(6), electricity_generation_per_capita: fact(2000), energi_percapita: fact(3000),
  } }]), answers)[0];
  const rows = result.details.filter((detail) => detail.priorityLabel);
  assert.equal(rows.length, pointGroups.flatMap((group) => group.measures).length);
  assert.ok(rows.every((detail) => detail.weight === 0 && detail.score === null));
  assert.equal(result.score, 100);
  assert.equal(result.coverage, 1);
  assert.equal(result.measureCount, 1);
});