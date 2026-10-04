import pandas as pd


OWID_HEADERS = {
    "storage_options": {
        "User-Agent": "Our World In Data data fetch/1.0"
    }
}


def _load_owid_series(url, measure, value_hint=None):
    data = pd.read_csv(url, **OWID_HEADERS)
    columns = {str(column).lower(): column for column in data.columns}
    entity_column = columns.get("entity")
    year_column = columns.get("year")
    day_column = columns.get("day")
    time_column = year_column or day_column
    if entity_column is None or time_column is None:
        raise ValueError(f"OWID dataset is missing Entity or Year/Day columns: {url}")

    metadata = {entity_column, time_column, columns.get("code")}
    value_columns = [column for column in data.columns if column not in metadata]
    if value_hint:
        exact_matches = [
            column for column in value_columns
            if value_hint.lower() == str(column).lower()
        ]
        value_columns = exact_matches or [
            column for column in value_columns
            if value_hint.lower() in str(column).lower()
        ]
    else:
        value_columns = [
            column for column in value_columns
            if pd.api.types.is_numeric_dtype(data[column])
        ]

    if len(value_columns) != 1:
        raise ValueError(
            f"Expected one value column for {measure}, found {value_columns}"
        )

    result = data[[entity_column, time_column, value_columns[0]]].copy()
    result.columns = ["land", "år", measure]
    result[measure] = pd.to_numeric(result[measure], errors="coerce")
    if day_column is not None and time_column == day_column:
        result["_observation_date"] = pd.to_datetime(result["år"], errors="coerce")
        result["år"] = result["_observation_date"].dt.year
        result = result.sort_values("_observation_date")
    else:
        result["år"] = pd.to_numeric(result["år"], errors="coerce")
    result = result.dropna(subset=["land", "år"])
    return result.drop_duplicates(subset=["land", "år"], keep="last").drop(
        columns=["_observation_date"], errors="ignore"
    )


def _load_local_series(path, measure, value_column):
    data = pd.read_csv(path)
    required_columns = {"Entity", "Year", value_column}
    missing_columns = required_columns.difference(data.columns)
    if missing_columns:
        raise ValueError(f"{path} is missing columns: {sorted(missing_columns)}")

    result = data[["Entity", "Year", value_column]].copy()
    result.columns = ["land", "år", measure]
    result[measure] = pd.to_numeric(result[measure], errors="coerce")
    result["år"] = pd.to_numeric(result["år"], errors="coerce")
    return result.dropna(subset=["land", "år"])


def load_data():
    owid_series = [
        ("livslängd", "life-expectancy.csv", None),
        ("suicid/100k", "death-rate-from-suicides-gho.csv", None),
        ("fetma_andel", "share-of-adults-defined-as-obese.csv", None),
        ("hdi", "human-development-index.csv", None),
        ("co2_percapita", "co-emissions-per-capita.csv", None),
        ("utbildning_andel_gdp", "total-government-expenditure-on-education-gdp.csv", None),
        ("sjukvård_andel_gdp", "public-health-expenditure-share-gdp.csv", None),
        ("lönegap", "gender-gap-in-average-wages-ilo.csv", None),
        ("andel_kvinnor_arbete", "ratio-of-female-to-male-labor-force-participation-rates-ilo-wdi.csv", None),
        ("skolår", "average-years-of-schooling.csv", None),
        ("bistånd_andel_bni", "foreign-aid-given-as-a-share-of-national-income.csv", "oda_official_estimate_share_gni"),
        ("skatt_andel_bnp", "tax-revenues-as-a-share-of-gdp-unu-wider.csv", None),
        ("statligautgifter_andel_bnp", "historical-gov-spending-gdp.csv", "expenditure"),
        ("gdp_per_capita", "gdp-per-capita-maddison-project-database.csv", "gdp_per_capita"),
        ("handel_andel_gdp", "trade-as-share-of-gdp.csv", None),
        ("livstillfredsställelse", "happiness-cantril-ladder.csv", None),
        ("barn_per_kvinna", "children-born-per-woman.csv", None),
        ("korruption_index", "political-corruption-index.csv", None),
        ("mord_percapita", "homicide-rate-ghe.csv", None),
        ("död_i_konflikt_percapita", "deaths-in-armed-conflicts.csv", "number_deaths_ongoing_conflicts__conflict_type_all"),
        (
            "share_religious",
            "religious-composition.csv?religion=any_religion&indicator=share",
            None,
        ),
        (
            "share_trust",
            "self-reported-trust-attitudes.csv",
            None,
        ),
        (
            "women_married_union_share",
            "share-of-women-aged-1549-who-are-married-or-in-a-union.csv",
            "estimate",
        ),
        (
            "generative_ai_adult_share",
            "estimated-share-people-generative-ai.csv",
            "ai_user_share",
        ),
        (
            "migrant_population_share",
            "migrant-stock-share.csv",
            None,
        ),
        (
            "annual_working_hours",
            "annual-working-hours-per-worker.csv",
            None,
        ),
        (
            "unemployment_rate",
            "unemployment-rate.csv",
            None,
        ),
        (
            "military_spending_gdp",
            "military-spending-as-a-share-of-gdp-sipri.csv",
            None,
        ),
        (
            "armed_forces_labor_share",
            "armed-forces-personnel-of-total-labor-force.csv",
            None,
        ),
        (
            "renewable_energy_share",
            "energy-mix.csv?source=renewables&metric=share",
            None,
        ),
        (
            "nuclear_energy_share",
            "energy-mix.csv?source=nuclear&metric=share",
            None,
        ),
        (
            "electricity_generation_per_capita",
            "electricity-mix.csv?source=total&metric=per_capita&frequency=annual",
            None,
        ),
        (
            "tobacco_use_adult_share",
            "share-of-adults-who-smoke.csv",
            None,
        ),
        (
            "alcohol_consumption_per_capita",
            "total-alcohol-consumption-per-capita-litres-of-pure-alcohol.csv",
            None,
        ),
        (
            "pm25_exposure",
            "average-exposure-pm25-pollution.csv",
            None,
        ),
        (
            "urban_population_share",
            "long-term-urban-population-region.csv",
            None,
        ),
    ]
    datasets = [
        _load_owid_series(
            f"https://ourworldindata.org/grapher/{source}"
            f"{'&' if '?' in source else '?'}v=1&csvType=full&useColumnShortNames=true",
            measure,
            value_hint,
        )
        for measure, source, value_hint in owid_series
    ]

    local_csv_series = [
        (
            "data/electoral-democracy-index.csv",
            "demokratiindex",
            "Electoral democracy index (central estimate)",
        ),
        (
            "data/energy-use-per-person.csv",
            "energi_percapita",
            "Primary energy consumption per capita (kWh/person)",
        ),
        (
            "data/deaths-in-armed-conflicts-based-on-where-they-occurred.csv",
            "conflict_deaths",
            "Deaths in ongoing conflicts (best estimate) - Conflict type: all",
        ),
    ]
    datasets.extend(
        _load_local_series(path, measure, value_column)
        for path, measure, value_column in local_csv_series
    )

    gini = pd.read_excel("data/gini.xlsx")
    gini.columns = ["land", "år", "gini"]
    datasets.append(gini)

    return datasets

variable_descriptions = pd.DataFrame({
    "Variabel": [
        "livslängd",
        "suicid/100k",
        "fetma_andel",
        "hdi",
        "demokratiindex",
        "co2_percapita",
        "energi_percapita",
        "utbildning_andel_gdp",
        "skatt_andel_bnp",
        "statligautgifter_andel_bnp",
        "gini",
        "gdp_per_capita",
        "handel_andel_gdp",
        "livstillfredsställelse",
        "barn_per_kvinna",
        "korruption_index",
        "mord_percapita",
        "död_i_konflikt_percapita",
        "share_religious",
        "share_trust",
        "women_married_union_share",
        "generative_ai_adult_share",
        "migrant_population_share",
        "annual_working_hours",
        "unemployment_rate",
        "military_spending_gdp",
        "armed_forces_labor_share",
        "renewable_energy_share",
        "nuclear_energy_share",
        "electricity_generation_per_capita",
        "tobacco_use_adult_share",
        "alcohol_consumption_per_capita",
        "pm25_exposure",
        "urban_population_share",
        "conflict_deaths",
        "sjukvård_andel_gdp",
        "lönegap",
        "andel_kvinnor_arbete",
        "skolår",
        "bistånd_andel_bni"
    ],
    "Beskrivning": [
        "Medellivslängd",
        "Antal suicid per 100 000 invånare",
        "Andel personer med fetma i befolkningen",
        "Human Development Index (HDI)",
        "Indexvärde för hur demokratiska länders valprocesser är på en skala mellan 0 och 1",
        "CO₂-utsläpp per capita",
        "Energianvändning per capita",
        "Utbildningsutgifter som andel av BNP",
        "Skatteintäkter som andel av BNP",
        "Statliga utgifter som andel av BNP",
        "Gini-koefficient – ett mått på ekonomisk ojämlikhet på en skala mellan 0 och 1",
        "BNP per capita",
        "Handel som andel av BNP",
        "Genomsnittlig livstillfredsställelse på en skala mellan 0 och 10",
        "Genomsnittligt antal födda barn per kvinna",
        "Indexvärde för upplevd politisk korruption på en skala mellan 0 och 1",
        "Antal mord per capita",
        "Antal döda i konflikter per capita",
        "Andel av befolkningen som är religiös",
        "Andel som anser att de flesta människor går att lita på",
        "Andel kvinnor 15-49 år som är gifta eller lever i en union (estimate series, excluding projections)",
        "Uppskattad andel vuxna 18-64 år som använder generativ AI",
        "Andel av befolkningen som är född i ett annat land",
        "Årliga arbetstimmar per arbetstagare",
        "Arbetslöshet som andel av arbetskraften",
        "Militärutgifter som andel av BNP",
        "Väpnade styrkor som andel av arbetskraften",
        "Andel av primärenergin från förnybara källor",
        "Andel av primärenergin från kärnkraft",
        "Elproduktion per person",
        "Andel vuxna som röker eller använder tobak",
        "Liter ren alkohol konsumerad per person och år",
        "Genomsnittlig exponering för PM2.5 i mikrogram per kubikmeter",
        "Andel av befolkningen som bor i tätort",
        "Dödsfall i pågående konflikter (bästa uppskattning, antal)",
        "Offentliga sjukvårdsutgifter som andel av BNP",
        "Skillnad mellan kvinnors och mäns genomsnittliga löner",
        "Kvinnors arbetskraftsdeltagande relativt mäns",
        "Genomsnittligt antal år i utbildning",
        "Bistånd som andel av bruttonationalinkomsten"
    ]
})