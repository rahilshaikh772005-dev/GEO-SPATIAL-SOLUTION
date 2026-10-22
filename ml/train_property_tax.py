from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = ROOT / "data" / "Geospatial_Property_Dataset_12000.xlsx"
DEFAULT_OUTPUT_DIR = ROOT / "models"
TARGET = "Current_Tax"
CATEGORICAL_FEATURES = ["Property_Type", "Ward"]
NUMERIC_FEATURES = [
    "Property_Area_sqft",
    "Building_Age_Years",
    "Family_Size",
    "Latitude",
    "Longitude",
    "Water_Usage_Liters",
    "Electricity_Units",
    "Previous_Tax",
    "Previous_Payment_Delay_Days",
    "Distance_From_Municipal_Office_km",
]
FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES


def train(dataset_path: Path, output_dir: Path) -> dict[str, float | int | str]:
    if not dataset_path.is_file():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")

    frame = pd.read_excel(dataset_path)
    required_columns = set(FEATURES + [TARGET])
    missing_columns = sorted(required_columns.difference(frame.columns))
    if missing_columns:
        raise ValueError(f"Dataset is missing required columns: {', '.join(missing_columns)}")
    if frame.empty:
        raise ValueError("Dataset contains no rows")

    target = pd.to_numeric(frame[TARGET], errors="coerce")
    if target.isna().any() or not np.isfinite(target.to_numpy()).all():
        raise ValueError(f"{TARGET} must contain only finite numeric values")

    features = frame[FEATURES].copy()
    for column in NUMERIC_FEATURES:
        features[column] = pd.to_numeric(features[column], errors="coerce")
    for column in CATEGORICAL_FEATURES:
        features[column] = features[column].astype("string")

    x_train, x_test, y_train, y_test = train_test_split(
        features, target, test_size=0.2, random_state=42
    )

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "numeric",
                Pipeline([("imputer", SimpleImputer(strategy="median"))]),
                NUMERIC_FEATURES,
            ),
            (
                "categorical",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("one_hot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                CATEGORICAL_FEATURES,
            ),
        ]
    )
    model = Pipeline(
        [
            ("preprocessor", preprocessor),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=200,
                    min_samples_leaf=2,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)

    metrics: dict[str, float | int | str] = {
        "target": TARGET,
        "rows": int(len(frame)),
        "training_rows": int(len(x_train)),
        "test_rows": int(len(x_test)),
        "mae": float(mean_absolute_error(y_test, predictions)),
        "rmse": float(np.sqrt(mean_squared_error(y_test, predictions))),
        "r2": float(r2_score(y_test, predictions)),
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    model_path = output_dir / "property_tax_model.joblib"
    metrics_path = output_dir / "property_tax_metrics.json"
    joblib.dump(model, model_path)
    metrics_path.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(f"Saved model: {model_path}")
    print(f"Saved metrics: {metrics_path}")
    print(json.dumps(metrics, indent=2))
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description="Train a property tax prediction model.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()
    train(args.dataset, args.output_dir)


if __name__ == "__main__":
    main()
