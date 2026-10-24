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

The questionnaire has four sections with a `current / total` indicator, progress bar, back action, and continue action. Previous responses remain selected when navigating back.

The first section lists nine priority groups with minus/plus steppers and fifteen points to allocate. Continue stays disabled until all fifteen are assigned; a separate action skips this section. Healthcare spending is not a priority group.

The second section lists six “My ideal society is characterized by…” statements. Each statement has five visible radio choices arranged horizontally beside it: “It doesn't matter”, “I don't agree at all”, “I somewhat disagree”, “I somewhat agree”, and “I agree fully”. “It doesn't matter” is separated with a divider and muted gray styling. Disagreement choices progress from red to lighter red; agreement choices progress from lighter green to green. Statement rows do not include measure-description subtitles.

The third section, Social Values, is headed “Which values are closest to your heart?” Short scales stay in one horizontal row of native radio circles, ordered from disagreement/negative to agreement/positive where applicable. Ten-point questions use a slider and numbered circle positions with the source endpoint labels beneath 1 and 10. “Don't know / no opinion” is a muted, separated choice at the far left and is equivalent to skipping. Coverage thresholds and profile counts appear in Our Methodology only, not while answering questions.

The fourth section lists five median-rate questions, excluding foreign aid. Each starts with a sentence containing the median, then asks “How much do you think is appropriate?” Military spending displays one decimal; other rates use whole percentages. Five absolute ranges and a skip action follow.

The “How it works” panel is top-aligned beside the questionnaire on desktop and appears above the current question section on smaller screens.

Supporting text explains allocated points, signed agreement multipliers, selected bands, and shared area averaging. Only answered preferences contribute to the score.

## Results and evidence

The results screen emphasizes the highest match, its fit score, number of matched measures, and data coverage. It lists the next two matches and shows area-fit bars for the leader. The report offers actions to change answers or start over.

Selecting a country opens its evidence table, grouped into contiguous area sections with area heading rows. Priority-allocation indicators have explicit labels with their point count and effective multiplier. Survey values use “Mean response” with exactly one decimal, and their year column shows 2017-2022. On narrow screens the year/period moves under the value and the percentile marker is hidden to avoid crowding. Multi-measure priority groups share one influence multiplier; it is not applied once per displayed row.

All priority indicators are shown, including zero-point and skipped groups. Their allocation labels show 0 points and their score/influence cells say Not scored / Excluded; available country values remain visible. Answered non-priority indicators are also shown. Missing country values say Not available / Not scored / Excluded. Slider endpoint labels are center-aligned, so wrapped lines remain centered within the same label block on both ends.

The Methodology screen is accessible from the top bar and returns to the previous in-app screen. It describes the scoring model at a high level and warns that indicators are imperfect proxies.

## Responsive behavior and accessibility

The layout changes to a single-column flow at tablet widths and uses a compact navigation, question, result, and detail layout on small screens. The evidence table hides its standalone year column on narrow screens while retaining the year below each value. At very narrow widths the table wrapper can scroll horizontally.

Question options are keyboard-focusable buttons presented as radio-group choices with `aria-checked` state. Focus receives a visible outline. Buttons provide hover feedback, and `prefers-reduced-motion` disables nonessential transitions and reveals.