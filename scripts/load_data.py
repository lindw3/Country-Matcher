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
        value_columns = [
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

    datasets = []


    # Livslängd
    livslängd = pd.read_csv(
        "https://ourworldindata.org/grapher/life-expectancy.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    livslängd.columns = ["land", "kod", "år", "livslängd"]
    livslängd = livslängd[["land", "år", "livslängd"]]
    datasets.append(livslängd)


    # Suicid
    suicid = pd.read_csv(
        "https://ourworldindata.org/grapher/death-rate-from-suicides-gho.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    suicid.columns = ["land", "kod", "år", "suicid/100k"]
    suicid = suicid[["land", "år", "suicid/100k"]]
    datasets.append(suicid)


    # Fetma
    fetma = pd.read_csv(
        "https://ourworldindata.org/grapher/share-of-adults-defined-as-obese.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    fetma.columns = ["land", "kod", "år", "fetma_andel", "region"]
    fetma = fetma[["land", "år", "fetma_andel"]]
    datasets.append(fetma)


    # HDI
    hdi = pd.read_csv(
        "https://ourworldindata.org/grapher/human-development-index.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    hdi.columns = ["land", "kod", "år", "hdi", "region"]
    hdi = hdi[["land", "år", "hdi"]]
    datasets.append(hdi)


    # Demokratiindex
    demokrati = pd.read_csv(
        "data/electoral-democracy-index.csv"
    )
    demokrati.columns = [
        "land",
        "år",
        "demokratiindex",
        "region"
    ]
    demokrati = demokrati[["land", "år", "demokratiindex"]]
    datasets.append(demokrati)


    # CO2
    co2 = pd.read_csv(
        "https://ourworldindata.org/grapher/co-emissions-per-capita.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    co2.columns = ["land", "kod", "år", "co2_percapita"]
    co2 = co2[["land", "år", "co2_percapita"]]
    datasets.append(co2)


    # Energi
    energi = pd.read_csv(
        "data/energy-use-per-person.csv"
    )
    energi.columns = [
        "land",
        "år",
        "energi_percapita"
    ]
    energi = energi[["land", "år", "energi_percapita"]]
    datasets.append(energi)


    # Utbildning
    utbildning = pd.read_csv(
        "https://ourworldindata.org/grapher/total-government-expenditure-on-education-gdp.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    utbildning.columns = [
        "land",
        "kod",
        "år",
        "utbildning_andel_gdp"
    ]
    utbildning = utbildning[["land", "år", "utbildning_andel_gdp"]]
    datasets.append(utbildning)


    # Sjukvård
    sjukvård = pd.read_csv(
        "https://ourworldindata.org/grapher/public-health-expenditure-share-gdp.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    sjukvård.columns = [
        "land",
        "kod",
        "år",
        "sjukvård_andel_gdp"
    ]
    sjukvård = sjukvård[["land", "år", "sjukvård_andel_gdp"]]
    datasets.append(sjukvård)


    # Lönegap
    lönegap = pd.read_csv(
        "https://ourworldindata.org/grapher/gender-gap-in-average-wages-ilo.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    lönegap.columns = [
        "land",
        "kod",
        "år",
        "lönegap"
    ]
    lönegap = lönegap[["land", "år", "lönegap"]]
    datasets.append(lönegap)


    # Kvinnors arbetskraftsdeltagande relativt män
    andel_kvinnor_arbete = pd.read_csv(
        "https://ourworldindata.org/grapher/ratio-of-female-to-male-labor-force-participation-rates-ilo-wdi.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    andel_kvinnor_arbete.columns = [
        "land",
        "kod",
        "år",
        "andel_kvinnor_arbete",
        "region"
    ]
    andel_kvinnor_arbete = andel_kvinnor_arbete[
        ["land", "år", "andel_kvinnor_arbete"]
    ]
    datasets.append(andel_kvinnor_arbete)


    # Skolår
    skolår = pd.read_csv(
        "https://ourworldindata.org/grapher/average-years-of-schooling.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    skolår.columns = [
        "land",
        "kod",
        "år",
        "skolår"
    ]
    skolår = skolår[["land", "år", "skolår"]]
    datasets.append(skolår)


    # Bistånd
    bistånd = pd.read_csv(
        "https://ourworldindata.org/grapher/foreign-aid-given-as-a-share-of-national-income.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    bistånd.columns = [
        "land",
        "kod",
        "år",
        "bistånd_andel_bni",
        "annotation"
    ]
    bistånd = bistånd[
        ["land", "år", "bistånd_andel_bni"]
    ]
    datasets.append(bistånd)


    # Skatt
    skatt = pd.read_csv(
        "https://ourworldindata.org/grapher/tax-revenues-as-a-share-of-gdp-unu-wider.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    skatt.columns = [
        "land",
        "kod",
        "år",
        "skatt_andel_bnp",
        "region"
    ]
    skatt = skatt[
        ["land", "år", "skatt_andel_bnp"]
    ]
    datasets.append(skatt)


    # Statliga utgifter
    statligautgifter = pd.read_csv(
        "https://ourworldindata.org/grapher/historical-gov-spending-gdp.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    statligautgifter.columns = [
        "land",
        "kod",
        "år",
        "statligautgifter_andel_bnp",
        "annotation"
    ]
    statligautgifter = statligautgifter[
        ["land", "år", "statligautgifter_andel_bnp"]
    ]
    datasets.append(statligautgifter)


    # Gini
    gini = pd.read_excel(
        "data/gini.xlsx"
    )
    gini.columns = [
        "land",
        "år",
        "gini"
    ]
    datasets.append(gini)


    # GDP per capita
    gdp = pd.read_csv(
        "https://ourworldindata.org/grapher/gdp-per-capita-maddison-project-database.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    gdp.columns = [
        "land",
        "kod",
        "år",
        "gdp_per_capita",
        "annotation"
    ]
    gdp = gdp[
        ["land", "år", "gdp_per_capita"]
    ]
    datasets.append(gdp)


    # Handel
    handel = pd.read_csv(
        "https://ourworldindata.org/grapher/trade-as-share-of-gdp.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    handel.columns = [
        "land",
        "kod",
        "år",
        "handel_andel_gdp"
    ]
    handel = handel[
        ["land", "år", "handel_andel_gdp"]
    ]
    datasets.append(handel)


    # Livstillfredsställelse
    livstillfredsställelse = pd.read_csv(
        "https://ourworldindata.org/grapher/happiness-cantril-ladder.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    livstillfredsställelse.columns = [
        "land",
        "kod",
        "år",
        "livstillfredsställelse"
    ]
    livstillfredsställelse = livstillfredsställelse[
        ["land", "år", "livstillfredsställelse"]
    ]
    datasets.append(livstillfredsställelse)



    # Barn per kvinna
    barn = pd.read_csv(
        "https://ourworldindata.org/grapher/children-born-per-woman.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    barn.columns = [
        "land",
        "kod",
        "år",
        "barn_per_kvinna"
    ]
    barn = barn[
        ["land", "år", "barn_per_kvinna"]
    ]
    datasets.append(barn)


    # Korruptionsindex
    korruption = pd.read_csv(
        "https://ourworldindata.org/grapher/political-corruption-index.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    korruption.columns = [
        "land",
        "kod",
        "år",
        "korruption_index",
        "region"
    ]
    korruption = korruption[
        ["land", "år", "korruption_index"]
    ]
    datasets.append(korruption)


    # Mord
    mord = pd.read_csv(
        "https://ourworldindata.org/grapher/homicide-rate-ghe.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    mord.columns = [
        "land",
        "kod",
        "år",
        "mord_percapita",
        "region"
    ]
    mord = mord[
        ["land", "år", "mord_percapita"]
    ]
    datasets.append(mord)


    # Död i väpnad konflikt
    död_konflikt = pd.read_csv(
        "https://ourworldindata.org/grapher/deaths-in-armed-conflicts.csv?v=1&csvType=full&useColumnShortNames=true",
        **OWID_HEADERS
    )
    död_konflikt.columns = [
        "land",
        "kod",
        "år",
        "död_i_konflikt_percapita_hög",
        "död_i_konflikt_percapita",
        "död_i_konflikt_percapita_låg"
    ]
    död_konflikt = död_konflikt[
        ["land", "år", "död_i_konflikt_percapita"]
    ]
    datasets.append(död_konflikt)


    # Additional candidate measures
    additional_owid_series = [
        (
            "share_religious",
            "https://ourworldindata.org/grapher/religious-composition.csv?v=1&csvType=full&useColumnShortNames=true&religion=any_religion&indicator=share",
            None,
        ),
        (
            "share_trust",
            "https://ourworldindata.org/grapher/self-reported-trust-attitudes.csv?v=1&csvType=full&useColumnShortNames=true",
            None,
        ),
        (
            "women_married_union_share",
            "https://ourworldindata.org/grapher/share-of-women-aged-1549-who-are-married-or-in-a-union.csv?v=1&csvType=full&useColumnShortNames=true",
            "estimate",
        ),
        (
            "generative_ai_adult_share",
            "https://ourworldindata.org/grapher/estimated-share-people-generative-ai.csv?v=1&csvType=full&useColumnShortNames=true",
            "ai_user_share",
        ),
        (
            "migrant_population_share",
            "https://ourworldindata.org/grapher/migrant-stock-share.csv?v=1&csvType=full&useColumnShortNames=true",
            None,
        ),
        (
            "annual_working_hours",
            "https://ourworldindata.org/grapher/annual-working-hours-per-worker.csv?v=1&csvType=full&useColumnShortNames=true",
            None,
        ),
        (
            "unemployment_rate",
            "https://ourworldindata.org/grapher/unemployment-rate.csv?v=1&csvType=full&useColumnShortNames=true",
            None,
        ),
        (
            "military_spending_gdp",
            "https://ourworldindata.org/grapher/military-spending-as-a-share-of-gdp-sipri.csv?v=1&csvType=full&useColumnShortNames=true",
            None,
        ),
        (
            "armed_forces_labor_share",
            "https://ourworldindata.org/grapher/armed-forces-personnel-of-total-labor-force.csv?v=1&csvType=full&useColumnShortNames=true",
            None,
        ),
        (
            "renewable_energy_share",
            "https://ourworldindata.org/grapher/energy-mix.csv?v=1&csvType=full&useColumnShortNames=true&source=renewables&metric=share",
            None,
        ),
        (
            "nuclear_energy_share",
            "https://ourworldindata.org/grapher/energy-mix.csv?v=1&csvType=full&useColumnShortNames=true&source=nuclear&metric=share",
            None,
        ),
        (
            "electricity_generation_per_capita",
            "https://ourworldindata.org/grapher/electricity-mix.csv?v=1&csvType=full&useColumnShortNames=true&source=total&metric=per_capita&frequency=annual",
            None,
        ),
        (
            "tobacco_use_adult_share",
            "https://ourworldindata.org/grapher/share-of-adults-who-smoke.csv?v=1&csvType=full&useColumnShortNames=true",
            None,
        ),
        (
            "alcohol_consumption_per_capita",
            "https://ourworldindata.org/grapher/total-alcohol-consumption-per-capita-litres-of-pure-alcohol.csv?v=1&csvType=full&useColumnShortNames=true",
            None,
        ),
        (
            "pm25_exposure",
            "https://ourworldindata.org/grapher/average-exposure-pm25-pollution.csv?v=1&csvType=full&useColumnShortNames=true",
            None,
        ),
        (
            "urban_population_share",
            "https://ourworldindata.org/grapher/long-term-urban-population-region.csv?v=1&csvType=full&useColumnShortNames=true",
            None,
        ),
    ]
    datasets.extend(
        _load_owid_series(url, measure, value_hint)
        for measure, url, value_hint in additional_owid_series
    )

    # This source reports total deaths, not a per-capita rate.
    datasets.append(
        _load_local_series(
            "data/deaths-in-armed-conflicts-based-on-where-they-occurred.csv",
            "conflict_deaths",
            "Deaths in ongoing conflicts (best estimate) - Conflict type: all",
        )
    )


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