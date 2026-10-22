"""Dataset loading, validation and schema definitions for the UCI Cleveland data.

The source file is the official UCI `processed.cleveland.data` file. Values are
comma separated, missing values are denoted by ``?`` and the columns follow the
order documented in ``data/raw/heart-disease.names``.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_DATA_PATH = PROJECT_ROOT / "data" / "raw" / "processed.cleveland.data"
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts"
PLOTS_DIR = ARTIFACTS_DIR / "plots"

RANDOM_SEED = 42
TEST_SIZE = 0.20
CV_FOLDS = 5

FEATURE_NAMES = [
    "age",
    "sex",
    "cp",
    "trestbps",
    "chol",
    "fbs",
    "restecg",
    "thalach",
    "exang",
    "oldpeak",
    "slope",
    "ca",
    "thal",
]
TARGET_NAME = "num"
CLASS_NAMES = ("No disease indicated", "Disease indicated")
NUMERIC_FEATURES = ["age", "trestbps", "chol", "thalach", "oldpeak", "ca"]
CATEGORICAL_FEATURES = [
    "sex",
    "cp",
    "fbs",
    "restecg",
    "exang",
    "slope",
    "thal",
]
MISSING_VALUE_TOKEN = "?"

# Metadata is shared by the API, the frontend contract and the saved schema.
# `min`/`max` are server-side validation bounds, not claims about clinical
# normality. `observed_min`/`observed_max` describe the training data.
FEATURE_SCHEMA = [
    {
        "key": "age",
        "label": "Age",
        "group": "patient",
        "type": "number",
        "unit": "years",
        "min": 18,
        "max": 100,
        "observed_min": 29,
        "observed_max": 77,
        "required": True,
        "description": "Age of the patient at the time of the examination.",
    },
    {
        "key": "sex",
        "label": "Sex",
        "group": "patient",
        "type": "category",
        "unit": None,
        "required": True,
        "options": [
            {"value": 0, "label": "Female"},
            {"value": 1, "label": "Male"},
        ],
        "description": "Recorded biological sex (UCI coding: 0 = female, 1 = male).",
    },
    {
        "key": "trestbps",
        "label": "Resting blood pressure",
        "group": "measurements",
        "type": "number",
        "unit": "mm Hg",
        "min": 80,
        "max": 250,
        "observed_min": 94,
        "observed_max": 200,
        "required": True,
        "description": "Resting systolic blood pressure on admission to hospital.",
    },
    {
        "key": "chol",
        "label": "Serum cholesterol",
        "group": "measurements",
        "type": "number",
        "unit": "mg/dL",
        "min": 100,
        "max": 600,
        "observed_min": 126,
        "observed_max": 564,
        "required": True,
        "description": "Total serum cholesterol measured at the examination.",
    },
    {
        "key": "fbs",
        "label": "Fasting blood sugar",
        "group": "measurements",
        "type": "category",
        "unit": None,
        "required": True,
        "options": [
            {"value": 0, "label": "120 mg/dL or below"},
            {"value": 1, "label": "Above 120 mg/dL"},
        ],
        "description": "Whether fasting blood sugar exceeds 120 mg/dL (UCI coding: 1 = true).",
    },
    {
        "key": "thalach",
        "label": "Maximum heart rate",
        "group": "measurements",
        "type": "number",
        "unit": "bpm",
        "min": 50,
        "max": 220,
        "observed_min": 71,
        "observed_max": 202,
        "required": True,
        "description": "Maximum heart rate achieved during the exercise stress test.",
    },
    {
        "key": "cp",
        "label": "Chest pain type",
        "group": "cardiac",
        "type": "category",
        "unit": None,
        "required": True,
        "options": [
            {"value": 1, "label": "Typical angina"},
            {"value": 2, "label": "Atypical angina"},
            {"value": 3, "label": "Non-anginal pain"},
            {"value": 4, "label": "Asymptomatic"},
        ],
        "description": "Chest pain category recorded at presentation (original UCI 1–4 coding).",
    },
    {
        "key": "restecg",
        "label": "Resting ECG",
        "group": "cardiac",
        "type": "category",
        "unit": None,
        "required": True,
        "options": [
            {"value": 0, "label": "Normal"},
            {"value": 1, "label": "ST-T wave abnormality"},
            {"value": 2, "label": "Left ventricular hypertrophy"},
        ],
        "description": "Resting electrocardiographic findings (UCI coding: 0 = normal, 1 = ST-T abnormality, 2 = probable/definite LVH).",
    },
    {
        "key": "exang",
        "label": "Exercise-induced angina",
        "group": "cardiac",
        "type": "category",
        "unit": None,
        "required": True,
        "options": [
            {"value": 0, "label": "No"},
            {"value": 1, "label": "Yes"},
        ],
        "description": "Whether exercise provoked angina during the stress test.",
    },
    {
        "key": "oldpeak",
        "label": "ST depression (oldpeak)",
        "group": "cardiac",
        "type": "number",
        "unit": "mm",
        "min": 0,
        "max": 10,
        "step": 0.1,
        "observed_min": 0.0,
        "observed_max": 6.2,
        "required": True,
        "description": "ST depression induced by exercise relative to rest, measured on the ECG.",
    },
    {
        "key": "slope",
        "label": "ST segment slope",
        "group": "cardiac",
        "type": "category",
        "unit": None,
        "required": True,
        "options": [
            {"value": 1, "label": "Upsloping"},
            {"value": 2, "label": "Flat"},
            {"value": 3, "label": "Downsloping"},
        ],
        "description": "Slope of the peak-exercise ST segment (UCI coding: 1 = upsloping, 2 = flat, 3 = downsloping).",
    },
    {
        "key": "ca",
        "label": "Major vessels coloured",
        "group": "cardiac",
        "type": "category",
        "unit": None,
        "required": False,
        "options": [
            {"value": 0, "label": "0 vessels"},
            {"value": 1, "label": "1 vessel"},
            {"value": 2, "label": "2 vessels"},
            {"value": 3, "label": "3 vessels"},
        ],
        "description": "Number of major vessels (0–3) coloured by fluoroscopy. May be left unrecorded; the training pipeline imputes the median.",
    },
    {
        "key": "thal",
        "label": "Thalassemia scan",
        "group": "cardiac",
        "type": "category",
        "unit": None,
        "required": False,
        "options": [
            {"value": 3, "label": "Normal"},
            {"value": 6, "label": "Fixed defect"},
            {"value": 7, "label": "Reversible defect"},
        ],
        "description": "Thallium stress-test result (original UCI coding: 3 = normal, 6 = fixed defect, 7 = reversible defect). May be left unrecorded; the training pipeline imputes the most frequent value.",
    },
]

FEATURE_SCHEMA_BY_KEY = {field["key"]: field for field in FEATURE_SCHEMA}
assert set(FEATURE_SCHEMA_BY_KEY) == set(FEATURE_NAMES)

TARGET_DESCRIPTION = (
    "Original angiographic disease status (`num`): 0 = less than 50% diameter "
    "narrowing, 1–4 = greater than 50% narrowing in at least one major vessel. "
    "For modelling, values 1–4 are combined into a binary 'disease indicated' class."
)


def load_raw_dataset(path: Path | str = RAW_DATA_PATH) -> pd.DataFrame:
    """Load and structurally validate the official 14-column Cleveland file."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {path}. See data/README.md for provenance."
        )

    df = pd.read_csv(
        path,
        header=None,
        names=FEATURE_NAMES + [TARGET_NAME],
        na_values=[MISSING_VALUE_TOKEN],
        skipinitialspace=True,
    )

    if df.shape != (303, 14):
        raise ValueError(f"Expected 303 rows x 14 columns, found {df.shape}.")
    if df.isna().sum().sum() != 6:
        raise ValueError(
            "Unexpected missing-value count; the official file has 6 missing cells "
            "(4 in ca, 2 in thal)."
        )
    if df[["ca", "thal"]].isna().sum().to_dict() != {"ca": 4, "thal": 2}:
        raise ValueError("Unexpected missing-value locations in ca/thal.")
    if not set(df[TARGET_NAME].unique()).issubset({0, 1, 2, 3, 4}):
        raise ValueError("Unexpected target values; expected integers 0–4.")

    for column in FEATURE_NAMES + [TARGET_NAME]:
        df[column] = pd.to_numeric(df[column], errors="raise")

    return df


def prepare_dataset(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Return X and the binarised target. Rows are intentionally not dropped."""
    missing = set(FEATURE_NAMES + [TARGET_NAME]) - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns: {sorted(missing)}")

    X = df[FEATURE_NAMES].copy()
    y = (df[TARGET_NAME] > 0).astype(int)
    y.name = "disease"
    return X, y


def split_dataset(
    X: pd.DataFrame, y: pd.Series
) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """Stratified, seeded 80/20 split shared by training and evaluation."""
    return train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_SEED,
        stratify=y,
    )


def dataset_fingerprint(df: pd.DataFrame) -> dict:
    """Small, JSON-serialisable profile used in artifacts and the dashboard."""
    class_counts = df[TARGET_NAME].value_counts().sort_index()
    return {
        "n_rows": int(len(df)),
        "n_features": len(FEATURE_NAMES),
        "target_distribution_original": {
            str(int(k)): int(v) for k, v in class_counts.items()
        },
        "binary_class_counts": {
            "no_disease": int((df[TARGET_NAME] == 0).sum()),
            "disease": int((df[TARGET_NAME] > 0).sum()),
        },
        "missing_values": {
            column: int(count)
            for column, count in df.isna().sum().items()
            if count > 0
        },
        "feature_ranges": {
            column: {
                "min": float(np.nanmin(df[column])),
                "max": float(np.nanmax(df[column])),
            }
            for column in FEATURE_NAMES
        },
    }
