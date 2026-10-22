"""Export the fitted scikit-learn pipeline for the Next.js runtime.

The Vercel deployment has no Python process. This script converts the fitted
preprocessing statistics and logistic-regression coefficients into a plain JSON
bundle that TypeScript can evaluate exactly. The original joblib pipeline stays
the training source of truth.

Usage (from the repository root):

    python -m ml.export_model
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from ml.dataset import (
    ARTIFACTS_DIR,
    FEATURE_NAMES,
    load_raw_dataset,
    prepare_dataset,
)

PIPELINE_PATH = ARTIFACTS_DIR / "heart_disease_pipeline.joblib"
METRICS_PATH = ARTIFACTS_DIR / "metrics.json"
SCHEMA_PATH = ARTIFACTS_DIR / "feature_schema.json"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"
BUNDLE_PATH = ARTIFACTS_DIR / "model_bundle.json"
PARITY_PATH = (
    Path(__file__).resolve().parents[1]
    / "src"
    / "lib"
    / "model"
    / "__fixtures__"
    / "parity.json"
)

DISCLAIMER = (
    "Educational decision-support demo only. This output is not a medical "
    "diagnosis, not a clinically validated risk score, and must not be used "
    "to guide patient care. Consult a qualified clinician for any medical "
    "concern."
)


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, allow_nan=False) + "\n", encoding="utf-8"
    )


def _native(value: Any) -> Any:
    """Convert numpy / pandas scalars to JSON-safe Python values."""
    if value is None:
        return None
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float) and math.isnan(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    return value


def build_model_info(
    metadata: dict[str, Any], metrics: dict[str, Any], schema: dict[str, Any]
) -> dict[str, Any]:
    """Build the same model-info payload the dashboard consumes."""
    test = metrics["test_evaluation"]
    selected = metadata["selected_model"]
    return {
        "model": {
            "key": selected["key"],
            "label": selected["label"],
            "version": metadata["model_version"],
            "trained_at_utc": metadata.get("trained_at_utc"),
            "threshold": float(selected.get("training_threshold", 0.5)),
            "hyperparameters": selected.get("hyperparameters", {}),
        },
        "selection": metrics.get("selection", {}),
        "validation": metadata.get("validation", {}),
        "test_metrics": test["metrics"],
        "comparison": metrics.get("model_comparison", []),
        "confusion_matrix": test["confusion_matrix"],
        "roc_curve": test["roc_curve"],
        "calibration": test["calibration"],
        "classification_report": test["classification_report"],
        "permutation_importance": test["permutation_importance"],
        "coefficient_analysis": test["coefficient_analysis"],
        "dataset": metrics.get("dataset", {}),
        "features": schema["features"],
        "preprocessing": schema["preprocessing"],
        "dataset_info": metadata.get("dataset", {}),
        "limitations": metadata.get("limitations", []),
        "intended_use": metadata.get("intended_use", ""),
        "target_definition": schema["target"]["description"],
        "disclaimer": DISCLAIMER,
    }


def extract_preprocessing(pipeline: Any, schema: dict[str, Any]) -> dict[str, Any]:
    """Read fitted imputation, scaling and encoding parameters from the pipeline."""
    preprocessor = pipeline.named_steps["preprocessor"]
    numeric = preprocessor.named_transformers_["num"]
    categorical = preprocessor.named_transformers_["cat"]

    numeric_features = list(numeric.feature_names_in_)
    categorical_features = list(categorical.feature_names_in_)
    expected_numeric = list(schema["preprocessing"]["numeric_features"])
    expected_categorical = list(schema["preprocessing"]["categorical_features"])

    if numeric_features != expected_numeric:
        raise ValueError(
            f"Numeric feature order mismatch: {numeric_features} != {expected_numeric}"
        )
    if categorical_features != expected_categorical:
        raise ValueError(
            "Categorical feature order mismatch: "
            f"{categorical_features} != {expected_categorical}"
        )

    imputer = numeric.named_steps["imputer"]
    scaler = numeric.named_steps["scaler"]
    cat_imputer = categorical.named_steps["imputer"]
    encoder = categorical.named_steps["onehot"]

    output_names = list(preprocessor.get_feature_names_out())
    categories = [[float(value) for value in values] for values in encoder.categories_]

    return {
        "numeric_features": numeric_features,
        "numeric_impute": [float(value) for value in imputer.statistics_],
        "numeric_mean": [float(value) for value in scaler.mean_],
        "numeric_scale": [float(value) for value in scaler.scale_],
        "categorical_features": categorical_features,
        "categorical_impute": [float(value) for value in cat_imputer.statistics_],
        "categorical_categories": categories,
        "output_feature_names": output_names,
        "numeric_imputation": "median",
        "categorical_imputation": "most_frequent",
        "numeric_scaling": "standard",
        "categorical_encoding": "one_hot(handle_unknown=ignore)",
    }


def extract_classifier(pipeline: Any) -> dict[str, Any]:
    classifier = pipeline.named_steps["classifier"]
    coefficients = np.asarray(classifier.coef_, dtype=float)
    intercept = np.asarray(classifier.intercept_, dtype=float)

    if coefficients.ndim != 2 or coefficients.shape[0] != 1:
        raise ValueError(f"Expected one logistic-regression coefficient row, got {coefficients.shape}")
    if intercept.size != 1:
        raise ValueError(f"Expected one intercept, got {intercept}")

    return {
        "classes": [int(value) for value in classifier.classes_],
        "intercept": float(intercept[0]),
        "coefficients": [float(value) for value in coefficients[0]],
        "n_features": int(classifier.n_features_in_),
    }


def build_parity_fixture(pipeline: Any, metadata: dict[str, Any]) -> dict[str, Any]:
    """Score every cohort row with sklearn so TypeScript can prove parity."""
    raw = load_raw_dataset()
    features, _ = prepare_dataset(raw)
    frame = features[FEATURE_NAMES]
    probabilities = pipeline.predict_proba(frame)[:, 1]
    log_odds = pipeline.decision_function(frame)

    rows = []
    for row_index, (_, row) in enumerate(frame.iterrows()):
        input_values = {
            name: _native(row[name]) for name in FEATURE_NAMES
        }
        rows.append(
            {
                "row_index": row_index,
                "input": input_values,
                "probability": round(float(probabilities[row_index]), 10),
                "log_odds": round(float(log_odds[row_index]), 10),
            }
        )

    return {
        "schema_version": "1.0.0",
        "model_version": metadata["model_version"],
        "threshold": 0.5,
        "rows": rows,
    }


def export_model_bundle() -> dict[str, Any]:
    """Write the runtime JSON bundle and the sklearn parity fixture."""
    if not PIPELINE_PATH.exists():
        raise FileNotFoundError(
            f"Missing pipeline: {PIPELINE_PATH}. Run `python -m ml.train` first."
        )

    pipeline = joblib.load(PIPELINE_PATH)
    metadata = _read_json(METADATA_PATH)
    metrics = _read_json(METRICS_PATH)
    schema = _read_json(SCHEMA_PATH)

    if list(pipeline.feature_names_in_) != FEATURE_NAMES:
        raise ValueError("Fitted pipeline feature order does not match FEATURE_NAMES.")

    preprocessing = extract_preprocessing(pipeline, schema)
    classifier = extract_classifier(pipeline)
    if len(classifier["coefficients"]) != len(preprocessing["output_feature_names"]):
        raise ValueError(
            "Classifier coefficient count does not match the transformed feature count."
        )

    selected = metadata["selected_model"]
    bundle = {
        "schema_version": "1.0.0",
        "exported_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "model": {
            "key": selected["key"],
            "label": selected["label"],
            "version": metadata["model_version"],
            "trained_at_utc": metadata.get("trained_at_utc"),
            "threshold": float(selected.get("training_threshold", 0.5)),
            "hyperparameters": selected.get("hyperparameters", {}),
        },
        "preprocessing": preprocessing,
        "classifier": classifier,
        "target_definition": schema["target"]["description"],
        "disclaimer": DISCLAIMER,
        "feature_schema": schema,
        "model_info": build_model_info(metadata, metrics, schema),
        "parity_fixture": str(PARITY_PATH.relative_to(Path(__file__).resolve().parents[1])),
    }

    # Keep a guard against accidentally exporting a non-linear estimator.
    if not hasattr(pipeline.named_steps["classifier"], "coef_"):
        raise ValueError("The selected model must expose linear coefficients for local explanations.")

    _write_json(BUNDLE_PATH, bundle)
    _write_json(PARITY_PATH, build_parity_fixture(pipeline, metadata))

    print(f"Exported Next.js model bundle: {BUNDLE_PATH}")
    print(f"Exported sklearn parity fixture: {PARITY_PATH}")
    return bundle


if __name__ == "__main__":
    export_model_bundle()
