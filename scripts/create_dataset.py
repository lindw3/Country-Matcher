import pandas as pd
from functools import reduce
from load_data import load_data


def merge_datasets(datasets):

    data = reduce(
        lambda left, right: pd.merge(
            left,
            right,
            on=["land", "år"],
            how="outer"
        ),
        datasets
    )

    return data


def create_dataset():

    # Ladda samtliga dataset
    datasets = load_data()

    # Slå ihop alla dataset
    data = merge_datasets(datasets)


    # Sortera data
    data = data.sort_values(
        ["land", "år"]
    )


    # Ta bort helt tomma kolumner
    data = data.dropna(
        axis=1,
        how="all"
    )


    # Spara som parquet
    data.to_parquet(
        "data/combined_dataset.parquet",
        index=False
    )


    print(
        "Dataset skapad:",
        data.shape
    )


if __name__ == "__main__":
    create_dataset()