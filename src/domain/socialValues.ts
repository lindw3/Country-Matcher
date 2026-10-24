import type { WvsQuestion } from "./country";

const reverseDisplay = new Set([
  "housewife-fulfilling",
  "believe-god",
  "public-surveillance",
  "same-sex-parents",
  "immigration-policy",
  "religion-important",
  "technology-future",
  "fight-country",
  "work-duty",
]);

export function socialValueOptions(question: WvsQuestion) {
  const options = question.options.filter((option) => option.scored);
  return reverseDisplay.has(question.id) ? options.reverse() : options;
}

export function isTenPointScale(question: WvsQuestion) {
  return socialValueOptions(question).length === 10;
}

export function categoryLabel(label: string) {
  const aliases: Record<string, string> = {
    "Reliable, abundant energy": "Energy",
    "Equality and gender opportunity": "Income equality",
    "LGBT+ inclusion": "LGBT+",
    "Personal safety": "Safety",
    "A population that values a healthy lifestyle.": "Health and wellbeing",
    "Tax revenue": "Taxes and government spending",
    "Government spending": "Taxes and government spending",
    "Military spending": "Military and national defence",
    "National defence": "Military and national defence",
    "Technology attitudes": "Technology",
    "Renewable energy": "Climate and environment",
    "Nuclear energy": "Energy",
    "Prosperity and high employment": "Prosperity and employment",
    "Climate and environmental priorities": "Climate and environment",
    "Democratic institutions and low corruption": "Democracy and corruption"
  };
  return aliases[label] ?? label;
}