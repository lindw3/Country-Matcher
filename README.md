# Country Matcher

Country Matcher compares a person's stated priorities for society with country-level indicators. It returns a preference-fit shortlist and shows the measures, years, and coverage behind each result. A fit score is not a claim that a country is universally better or a prediction of whether someone would be happy living there.

## Run locally

Prerequisites: Node.js/npm and Python.

From the project root:

```sh
python -m pip install -r requirements.txt
npm install
python scripts/prepare_country_data.py
npm run dev
```

The data preparation command downloads the configured Our World in Data (OWID) series and reads the local files in `data/`. It writes the frontend snapshot to `public/data/countries.json`. The browser requests that file when the app starts. Regenerate the snapshot to refresh the measurements; this requires network access to the OWID Grapher CSV endpoints.

Create a production build with:

```sh
npm run build
```

## GitHub Pages

The `Deploy to GitHub Pages` workflow publishes the site when changes are pushed to `main`. It installs the Python and Node dependencies, regenerates `public/data/countries.json`, builds the Vite site with the `/Country-Matcher/` base path, and deploys the `dist/` artifact. The app's data request uses Vite's base URL, so it resolves correctly on project Pages.

In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The first deployment requires that setting and the workflow permissions for Pages deployment, which the workflow declares.

## Project map

- `src/App.tsx` contains the app screens and interactions.
- `src/domain/questions.ts` defines the point groups, ideal-society statements, median questions, and answer types.
- `src/domain/matching.ts` contains the current fit-scoring rules and country detail metadata.
- `src/domain/country.ts` defines the browser data types.
- `src/styles.css` defines the visual system and responsive layouts.
- `scripts/load_data.py` loads the 40 source measures and provides their descriptions.
- `scripts/prepare_country_data.py` selects each country's latest usable value per measure and exports the JSON snapshot.
- `scripts/create_dataset.py` can create a historical outer-joined Parquet table; the website does not currently read that table.
- `data/` contains the local OWID extracts and Gini workbook used by the loader.

Question answers are stored in this browser's local storage. There is no account, backend service, or server-side answer submission.

For the current questionnaire, included measures, scoring assumptions, and data limitations, see [OVERVIEW.md](OVERVIEW.md). For screen behavior and visual conventions, see [LAYOUT.md](LAYOUT.md). For implementation and data flow, see [SITE_STRUCTURE.md](SITE_STRUCTURE.md).