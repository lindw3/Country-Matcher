# Interface and Interaction

This document describes the interface as implemented in `src/App.tsx` and `src/styles.css`.

## Visual system

The interface is quiet and editorial: an off-white canvas, restrained color, a clear type hierarchy, and minimal motion. The page is an interactive tool, not a marketing landing page. There are no decorative images or charts; data is presented as rankings, area bars, and an evidence table.

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#f5f4ef` | Page background |
| Ink | `#182e36` | Main text |
| Muted | `#68787a` | Secondary text and metadata |
| Blue | `#173d79` | Primary action and score emphasis |
| Green | `#416e54` | Area labels, progress, and data emphasis |
| Rust | `#b05c42` | Small contrasting accent and skip hover state |

Typography uses DM Sans for interface text, Newsreader for expressive headings and selected figures, and DM Mono for data labels and metadata. Motion is limited to short screen reveals, progress movement, and button hover feedback; reduced-motion preferences are honored.

## Shared frame

The top bar contains the Country Matcher mark, current country/measure counts, and a Methodology action. The footer reinforces that the score describes fit with the respondent's answers, not a universal country ranking. The page uses a centered content width, simple rules, and square-cornered controls.

## Introduction

The first screen describes the task, displays country and measure counts, offers a start action, and states that answers stay in the browser. The start action is disabled until the country JSON is available.

## Questionnaire

The questionnaire has three sections with a `current / total` indicator, progress bar, back action, and continue action. Previous responses remain selected when navigating back.

The first section lists nine shared-foundation groups with minus/plus steppers. The respondent allocates ten points total, including the option to put all points in one group. Continue stays disabled until ten points are assigned; a separate action skips this section.

The second section lists seven “My ideal society is characterized by…” statements. Each statement has five visible radio choices arranged horizontally beside it: “It doesn't matter”, “I don't agree at all”, “I somewhat disagree”, “I somewhat agree”, and “I agree fully”. Statement rows do not include measure-description subtitles.

The third section lists six measures. Each starts with a sentence that states the median in plain language, followed by “How much do you think is appropriate?” Five absolute ranges and a skip action follow. Foreign-aid values show two decimal places; the other rates show whole percentages. If the median is zero or below, the interface explains that ranges use percentile cutoffs across distinct observed values instead.

The “How it works” panel is top-aligned beside the questionnaire on desktop and appears above the current question section on smaller screens.

Supporting text explains how allocated points, signed agreement multipliers, selected bands, and the always-included general life-satisfaction score affect the comparison.

## Results and evidence

The results screen emphasizes the highest match, its fit score, number of matched measures, and data coverage. It lists the next two matches and shows area-fit bars for the leader. The report offers actions to change answers or start over.

Selecting a country opens its evidence table. Desktop shows area and measure, raw value with unit, year, peer percentile, and fit contribution. On narrow screens, the year moves under the value and the percentile marker is hidden to avoid crowding; the percentile text and fit score remain visible. The table may scroll horizontally if a device is too narrow for the column content.

The Methodology screen is accessible from the top bar and returns to the previous in-app screen. It describes the scoring model at a high level and warns that indicators are imperfect proxies.

## Responsive behavior and accessibility

The layout changes to a single-column flow at tablet widths and uses a compact navigation, question, result, and detail layout on small screens. The evidence table hides its standalone year column on narrow screens while retaining the year below each value. At very narrow widths the table wrapper can scroll horizontally.

Question options are keyboard-focusable buttons presented as radio-group choices with `aria-checked` state. Focus receives a visible outline. Buttons provide hover feedback, and `prefers-reduced-motion` disables nonessential transitions and reveals.