import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd
import pycountry

sys.path.insert(0, str(Path(__file__).parent))
from load_data import load_data


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "data" / "countries.json"
COUNTRY_ALIASES = {
    "Bolivia": "Bolivia, Plurinational State of",
    "Iran": "Iran, Islamic Republic of",
    "Moldova": "Moldova, Republic of",
    "North Korea": "Korea, Democratic People's Republic of",
    "Russia": "Russian Federation",
    "South Korea": "Korea, Republic of",
    "Syria": "Syrian Arab Republic",
    "Taiwan": "Taiwan, Province of China",
    "Tanzania": "Tanzania, United Republic of",
    "The Gambia": "Gambia",
    "Turkey": "Türkiye",
    "Venezuela": "Venezuela, Bolivarian Republic of",
    "Vietnam": "Viet Nam",
}


def canonical_country_name(name):
    candidate = COUNTRY_ALIASES.get(name, name)
    try:
        return pycountry.countries.lookup(candidate).name
    except LookupError:
        return None


def prepare_country_data():
    measures = {}
    for frame in load_data():
        measure = frame.columns[-1]
        latest = frame.dropna(subset=[measure]).copy()
        latest["land"] = latest["land"].map(canonical_country_name)
        latest = latest.dropna(subset=["land"])
        latest = latest.sort_values("år").drop_duplicates("land", keep="last")
        values = pd.to_numeric(latest[measure], errors="coerce")
        valid = latest.loc[values.notna()].copy()
        if valid.empty:
            continue

        valid["value"] = values.loc[valid.index]
        valid["percentile"] = valid["value"].rank(pct=True, method="average") * 100
        measures[measure] = valid.set_index("land")[["value", "år", "percentile"]]

    countries = {}
    for measure, frame in measures.items():
        for country, row in frame.iterrows():
            countries.setdefault(country, {})[measure] = {
                "value": float(row["value"]),
                "year": int(row["år"]),
                "percentile": round(float(row["percentile"]), 2),
            }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generatedAt": date.today().isoformat(),
        "countryCount": len(countries),
        "measureCount": len(measures),
        "countries": [
            {"name": name, "measures": country_measures}
            for name, country_measures in sorted(countries.items())
        ],
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=True), encoding="utf-8")
    print(f"Created {OUTPUT.relative_to(ROOT)}: {len(countries)} countries, {len(measures)} measures")


if __name__ == "__main__":
    prepare_country_data()