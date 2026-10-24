import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readXls } from "./read_wvs_xls.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIRECTORY = path.join(ROOT, "data");
const OUTPUT = path.join(DATA_DIRECTORY, "wvs_values.json");

const countryAliases = {
  Bolivia: "Bolivia, Plurinational State of",
  "Bosnia Herzegovina": "Bosnia and Herzegovina",
  "Hong Kong SAR": "Hong Kong",
  Iran: "Iran, Islamic Republic of",
  "Macau SAR": "Macao",
  Russia: "Russian Federation",
  "South Korea": "Korea, Republic of",
  "Taiwan ROC": "Taiwan, Province of China",
  Turkey: "Türkiye",
  Venezuela: "Venezuela, Bolivarian Republic of",
  Vietnam: "Viet Nam",
  "Great Britain": "United Kingdom",
  "Northern Ireland": null,
};

const questions = [
  {
    id: "housewife-fulfilling",
    file: "Being_a_housewife_just_as_fulfilling_as_working.xls",
    prompt: "Being a housewife is just as fulfilling as working for pay.",
    area: "Family values",
  },
  {
    id: "believe-god",
    file: "Believe_in_God.xls",
    prompt: "Do you believe in God?",
    area: "Religion",
  },
  {
    id: "public-surveillance",
    file: "Government_has_the_right_Keep_people_under_video_surveillance_in_public_areas.xls",
    prompt: "The government should have the right to keep people under video surveillance in public areas.",
    area: "Safety",
  },
  {
    id: "government-responsibility",
    file: "Governments_vs_individuals_responsibility_to_provide.xls",
    prompt: "Where should responsibility lie for ensuring that everyone is provided for?",
    area: "Political outlook",
  },
  {
    id: "same-sex-parents",
    file: "Homosexual_couples_are_as_good_parents_as_other_couples.xls",
    prompt: "Homosexual couples are as good parents as other couples.",
    area: "LGBT+",
  },
  {
    id: "immigration-policy",
    file: "Immigration_policy_preference.xls",
    prompt: "What immigration policy should a country have?",
    area: "Immigration and openness",
  },
  {
    id: "religion-important",
    file: "Important_in_life_Religion.xls",
    prompt: "How important is religion in your life?",
    area: "Religion",
  },
  {
    id: "income-equality",
    file: "Incomes_should_be_made_more_equal_vs_There_should_be_greater_incentives_for_individual_effort.xls",
    prompt: "Should incomes be made more equal, or should there be greater incentives for individual effort?",
    area: "Income equality",
  },
  {
    id: "abortion-justifiable",
    file: "Justifiable_Abortion.xls",
    prompt: "To what extent is abortion justifiable?",
    area: "Personal autonomy",
  },
  {
    id: "casual-sex-justifiable",
    file: "Justifiable_Having_casual_sex.xls",
    prompt: "To what extent is having casual sex justifiable?",
    area: "Personal autonomy",
  },
  {
    id: "left-right",
    file: "Left-right_political_scale.xls",
    prompt: "Where would you place yourself on the left-right political scale?",
    area: "Political outlook",
  },
  {
    id: "technology-future",
    file: "More_emphasis_on_technology_in_the_future.xls",
    prompt: "Would more emphasis on technology in the future be a good thing or a bad thing?",
    area: "Technology",
  },
  {
    id: "state-ownership",
    file: "Private_vs_state_ownership_of_business.xls",
    prompt: "Should private ownership or government ownership of business be increased?",
    area: "Political outlook",
  },
  {
    id: "environment-growth",
    file: "Protecting_environment_vs._economic_growth.xls",
    prompt: "Should protecting the environment or economic growth and creating jobs be given priority?",
    area: "Climate and environmental priorities",
  },
  {
    id: "technology-improves-life",
    file: "Science_and_technology_are_making_our_lives_healthier_easier_and_more_comfortable.xls",
    prompt: "Science and technology are making our lives healthier, easier and more comfortable.",
    area: "Technology",
  },
  {
    id: "fight-country",
    file: "Willingness_to_fight_for_country.xls",
    prompt: "Would you be willing to fight for your country?",
    area: "Military and national defence",
  },
  {
    id: "work-duty",
    file: "Work_is_a_duty_towards_society.xls",
    prompt: "Work is a duty towards society.",
    area: "Work",
  },
];

function isUnscoredOption(label) {
  return /^(don't know|don't mind|no opinion|other answer)$/i.test(label.trim());
}

function sourcePriority(name) {
  return name === "Great Britain" ? 2 : 1;
}

const suppliedFiles = fs.readdirSync(DATA_DIRECTORY).filter((file) => file.endsWith(".xls"));
const missingDefinitions = suppliedFiles.filter((file) => !questions.some((question) => question.file === file));
if (missingDefinitions.length) throw new Error(`WVS files need question definitions: ${missingDefinitions.join(", ")}`);

const output = [];
for (const question of questions) {
  const sourcePath = path.join(DATA_DIRECTORY, question.file);
  const sheet = readXls(sourcePath)[0];
  const [header, ...rows] = sheet.rows;
  if (header[0] !== "Answer" || header[1] !== "Total") throw new Error(`Unexpected table headers in ${question.file}`);
  const options = rows.map((row, index) => ({
    value: index + 1,
    label: String(row[0] ?? ""),
    scored: !isUnscoredOption(String(row[0] ?? "")),
  }));
  const scoredOptions = options.filter((option) => option.scored);
  const countryValues = {};

  for (let column = 2; column < header.length; column += 1) {
    const sourceCountry = header[column];
    if (!sourceCountry) continue;
    const country = Object.hasOwn(countryAliases, sourceCountry) ? countryAliases[sourceCountry] : sourceCountry;
    if (!country) continue;
    let weightedTotal = 0;
    let substantiveShare = 0;
    for (const option of scoredOptions) {
      const share = rows[option.value - 1]?.[column];
      if (typeof share !== "number" || !Number.isFinite(share)) continue;
      if (share < 0 || share > 100) throw new Error(`Invalid response percentage in ${question.file}: ${sourceCountry}`);
      weightedTotal += option.value * share;
      substantiveShare += share;
    }
    if (substantiveShare === 0) continue;
    const candidate = {
      value: weightedTotal / substantiveShare,
      sourceCountry,
      sourcePriority: sourcePriority(sourceCountry),
    };
    const existing = countryValues[country];
    if (!existing || candidate.sourcePriority > existing.sourcePriority) countryValues[country] = candidate;
  }

  output.push({
    ...question,
    source: "World Values Survey, supplied country response-share extracts",
    surveyPeriod: "2017-2022",
    year: null,
    sourceCountries: header.slice(2).filter(Boolean).map((sourceCountry) => ({
      sourceCountry,
      country: Object.hasOwn(countryAliases, sourceCountry) ? countryAliases[sourceCountry] : sourceCountry,
    })),
    options,
    minimum: Math.min(...scoredOptions.map((option) => option.value)),
    maximum: Math.max(...scoredOptions.map((option) => option.value)),
    countries: countryValues,
  });
}

fs.writeFileSync(OUTPUT, `${JSON.stringify({ source: "World Values Survey, supplied country response-share extracts", questions: output }, null, 2)}\n`);
console.log(`Created ${path.relative(ROOT, OUTPUT)} with ${output.length} questions.`);
