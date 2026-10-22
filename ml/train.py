"""Heart disease model training and selection.

Usage (from the repository root):

    python -m ml.train

The script downloads nothing: it reads the vendored official UCI Cleveland file,
compares Logistic Regression, Random Forest and Decision Tree with 5-fold
stratified cross-validation, selects a model using only training-fold results,
then evaluates that model once on the stratified 20% holdout.
"""

from __future__ import annotations

import hashlib
import json
import platform
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

from ml.dataset import (
    ARTIFACTS_DIR,
    CATEGORICAL_FEATURES,
    CV_FOLDS,
    FEATURE_NAMES,
    FEATURE_SCHEMA,
    NUMERIC_FEATURES,
    RANDOM_SEED,
    TARGET_DESCRIPTION,
    TEST_SIZE,
    load_raw_dataset,
    prepare_dataset,
    split_dataset,
)
from ml.evaluate import evaluate_and_save

PIPELINE_PATH = ARTIFACTS_DIR / "heart_disease_pipeline.joblib"
METRICS_PATH = ARTIFACTS_DIR / "metrics.json"
SCHEMA_PATH = ARTIFACTS_DIR / "feature_schema.json"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"

SCORING = {
    "accuracy": "accuracy",
    "precision": "precision",
    "recall": "recall",
    "f1": "f1",
    "roc_auc": "roc_auc",
}
PRIMARY_SELECTION_METRIC = "f1"

MODEL_SPECS = {
    "logistic_regression": {
        "label": "Logistic Regression",
        "short_description": (
            "Linear baseline on log-odds. Fast, stable and interpretable; "
            "coefficients can be inspected per transformed feature."
        ),
        "estimator": LogisticRegression(
            max_iter=5000,
            solver="lbfgs",
            random_state=RANDOM_SEED,
        ),
        "param_grid": {
            "classifier__C": [0.01, 0.1, 1.0, 10.0],
            "classifier__class_weight": [None, "balanced"],
        },
    },
    "random_forest": {
        "label": "Random Forest",
        "short_description": (
            "Bagged ensemble of decision trees. Captures non-linear effects and "
            "interactions while averaging away some single-tree variance."
        ),
        "estimator": RandomForestClassifier(
            n_estimators=400,
            random_state=RANDOM_SEED,
            n_jobs=1,
        ),
        "param_grid": {
            "classifier__n_estimators": [300, 500],
            "classifier__max_depth": [None, 4, 6],
            "classifier__min_samples_leaf": [1, 3],
            "classifier__max_features": ["sqrt", 0.5],
            "classifier__class_weight": [None, "balanced_subsample"],
        },
    },
    "decision_tree": {
        "label": "Decision Tree",
        "short_description": (
            "A single interpretable tree. Useful as a transparent comparison but "
            "more prone to overfitting than the ensemble alternatives."
        ),
        "estimator": DecisionTreeClassifier(random_state=RANDOM_SEED),
        "param_grid": {
            "classifier__max_depth": [3, 4, 5, None],
            "classifier__min_samples_leaf": [1, 5],
            "classifier__criterion": ["gini", "entropy"],
            "classifier__class_weight": [None, "balanced"],
        },
    },
}


def build_preprocessor() -> ColumnTransformer:
    """Build the leakage-safe preprocessing stage used inside every pipeline."""
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            (
                "onehot",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
            ),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, NUMERIC_FEATURES),
            ("cat", categorical_pipeline, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
        verbose_feature_names_out=True,
    )


def build_pipeline(model_key: str) -> Pipeline:
    return Pipeline(
        steps=[
            ("preprocessor", build_preprocessor()),
            ("classifier", MODEL_SPECS[model_key]["estimator"]),
        ]
    )


def _round(value: float, digits: int = 4) -> float:
    return round(float(value), digits)


def _clean_params(params: dict) -> dict:
    """Strip sklearn's 'classifier__' prefix for readable artifact JSON."""
    cleaned = {}
    for key, value in params.items():
        clean_key = key.split("__", 1)[1] if "__" in key else key
        cleaned[clean_key] = value
    return cleaned


def cross_validate_model(model_key: str, X_train, y_train, cv) -> dict:
    pipeline = build_pipeline(model_key)
    search = GridSearchCV(
        pipeline,
        param_grid=MODEL_SPECS[model_key]["param_grid"],
        scoring="roc_auc",
        cv=cv,
        n_jobs=1,
        refit=True,
        return_train_score=False,
        error_score="raise",
    )
    started = time.perf_counter()
    search.fit(X_train, y_train)
    elapsed = time.perf_counter() - started

    cv_result = cross_validate(
        search.best_estimator_,
        X_train,
        y_train,
        cv=cv,
        scoring=SCORING,
        n_jobs=1,
        return_train_score=False,
    )

    cv_metrics = {}
    for metric in SCORING:
        values = [float(value) for value in cv_result[f"test_{metric}"]]
        cv_metrics[metric] = {
            "mean": _round(np.mean(values)),
            "std": _round(np.std(values)),
            "folds": [_round(value) for value in values],
        }

    return {
        "key": model_key,
        "label": MODEL_SPECS[model_key]["label"],
        "description": MODEL_SPECS[model_key]["short_description"],
        "cv": cv_metrics,
        "best_params": _clean_params(search.best_params_),
        "tuning": {
            "scoring": "roc_auc",
            "candidates_evaluated": int(len(search.cv_results_["params"])),
            "best_grid_cv_roc_auc": _round(search.best_score_),
            "folds": CV_FOLDS,
        },
        "fit_seconds": round(elapsed, 2),
        "estimator": search.best_estimator_,
    }


def select_model(results: list[dict]) -> dict:
    """Rank models by mean CV F1, using CV ROC-AUC as a tie-breaker."""
    ranked = sorted(
        results,
        key=lambda item: (
            item["cv"][PRIMARY_SELECTION_METRIC]["mean"],
            item["cv"]["roc_auc"]["mean"],
        ),
        reverse=True,
    )
    for rank, result in enumerate(ranked, start=1):
        result["rank"] = rank
    selected = ranked[0]
    runner_up = ranked[1]
    return {
        "selected_model_key": selected["key"],
        "selected_model_name": selected["label"],
        "primary_metric": PRIMARY_SELECTION_METRIC,
        "primary_metric_label": "Mean 5-fold cross-validated F1",
        "tie_breaker": "Mean 5-fold cross-validated ROC-AUC",
        "selected_cv_scores": selected["cv"],
        "runner_up": runner_up["label"],
        "rationale": (
            f"{selected['label']} had the highest mean 5-fold CV F1 "
            f"({selected['cv']['f1']['mean']:.3f} ± {selected['cv']['f1']['std']:.3f}) "
            f"and positive-class recall of {selected['cv']['recall']['mean']:.3f}. "
            "F1 balances positive-class recall against false positives, while "
            "ROC-AUC served as a tie-breaker. The held-out test set was not used "
            "for model or hyperparameter selection."
        ),
        "selection_protocol": (
            "Hyperparameters were tuned with 5-fold stratified GridSearchCV using "
            "ROC-AUC. All models were then scored with the same 5-fold splits on "
            "the training partition. The final model was chosen by mean CV F1, "
            "then evaluated once on the untouched stratified 20% holdout."
        ),
        "rankings": [
            {
                "rank": result["rank"],
                "model": result["label"],
                "cv_f1": result["cv"]["f1"]["mean"],
                "cv_recall": result["cv"]["recall"]["mean"],
                "cv_roc_auc": result["cv"]["roc_auc"]["mean"],
            }
            for result in ranked
        ],
    }


def _write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def main() -> None:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    (ARTIFACTS_DIR / "plots").mkdir(parents=True, exist_ok=True)
    started_at = datetime.now(timezone.utc)

    raw_df = load_raw_dataset()
    X, y = prepare_dataset(raw_df)
    X_train, X_test, y_train, y_test = split_dataset(X, y)

    cv = StratifiedKFold(
        n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_SEED
    )

    print(f"Dataset: {len(X)} rows, {len(FEATURE_NAMES)} features")
    print(
        f"Training: {len(X_train)} rows | holdout: {len(X_test)} rows | "
        f"positive rate: {y.mean():.3f}"
    )
    print("=" * 72)

    results = []
    for model_key in MODEL_SPECS:
        print(f"Tuning {MODEL_SPECS[model_key]['label']}...")
        result = cross_validate_model(model_key, X_train, y_train, cv)
        results.append(result)
        print(
            f"  best params: {result['best_params']} | "
            f"CV F1={result['cv']['f1']['mean']:.3f}, "
            f"recall={result['cv']['recall']['mean']:.3f}, "
            f"AUC={result['cv']['roc_auc']['mean']:.3f}"
        )
        # The fitted search estimator is needed only for the selected model.
        result["_estimator"] = result.pop("estimator")

    selection = select_model(results)
    selected = next(
        result
        for result in results
        if result["key"] == selection["selected_model_key"]
    )
    final_pipeline = selected.pop("_estimator")
    comparison = []
    for result in results:
        result.pop("_estimator", None)
        comparison.append(result)

    print("=" * 72)
    print(selection["rationale"])

    joblib.dump(final_pipeline, PIPELINE_PATH)
    feature_schema = {
        "schema_version": "1.0.0",
        "project": "Heart Disease Risk Detection Using Machine Learning",
        "target": {
            "name": "num",
            "model_name": "disease",
            "labels": {"0": "No disease indicated", "1": "Disease indicated"},
            "description": TARGET_DESCRIPTION,
        },
        "features": FEATURE_SCHEMA,
        "model_input_order": FEATURE_NAMES,
        "preprocessing": {
            "numeric_features": NUMERIC_FEATURES,
            "categorical_features": CATEGORICAL_FEATURES,
            "numeric_imputation": "median (fitted on training folds only)",
            "categorical_imputation": "most frequent (fitted on training folds only)",
            "numeric_scaling": "StandardScaler (fitted on training folds only)",
            "categorical_encoding": "OneHotEncoder(handle_unknown='ignore'); one reference level per feature",
            "nullable_fields": ["ca", "thal"],
        },
        "encoding_notes": (
            "Uses the original UCI Cleveland codes, not the modified Kaggle "
            "encodings: cp 1–4, restecg 0–2, slope 1–3, thal 3/6/7, and "
            "num 0–4 mapped to binary via num > 0."
        ),
    }
    _write_json(SCHEMA_PATH, feature_schema)

    trained_at = datetime.now(timezone.utc)
    dataset_checksum = hashlib.sha256(
        (Path(__file__).resolve().parents[1] / "data" / "raw" / "processed.cleveland.data").read_bytes()
    ).hexdigest()
    metadata = {
        "schema_version": "1.0.0",
        "project": "Heart Disease Risk Detection Using Machine Learning",
        "model_version": "1.0.0",
        "trained_at_utc": trained_at.isoformat(timespec="seconds"),
        "training_duration_seconds": round(
            (trained_at - started_at).total_seconds(), 2
        ),
        "dataset": {
            "name": "UCI Heart Disease — Cleveland",
            "source_url": "https://archive.ics.uci.edu/dataset/45/heart+disease",
            "raw_file": "data/raw/processed.cleveland.data",
            "sha256": dataset_checksum,
            "n_rows": int(len(X)),
            "n_predictors": len(FEATURE_NAMES),
            "missing_cells": {"ca": 4, "thal": 2},
            "class_counts": {
                "no_disease": int((y == 0).sum()),
                "disease": int((y == 1).sum()),
            },
            "positive_class_definition": (
                "num > 0: >50% diameter narrowing in at least one major vessel. "
                "This is presence of angiographic disease, not future risk."
            ),
        },
        "features": FEATURE_NAMES,
        "selection": selection,
        "selected_model": {
            "key": selection["selected_model_key"],
            "label": selection["selected_model_name"],
            "hyperparameters": selected["best_params"],
            "cv_metrics": selected["cv"],
            "training_threshold": 0.5,
        },
        "validation": {
            "split": "stratified 80/20 train/test",
            "random_seed": RANDOM_SEED,
            "test_size": TEST_SIZE,
            "cv_folds": CV_FOLDS,
            "cv_shuffle": True,
            "grid_search_scoring": "roc_auc",
            "selection_scoring": "mean cross-validated F1 (ROC-AUC tie-break)",
            "test_set_used_for_selection": False,
        },
        "runtime": {
            "python": platform.python_version(),
            "scikit_learn": sklearn.__version__,
            "pandas": pd.__version__,
            "numpy": np.__version__,
            "platform": platform.platform(),
        },
        "artifacts": {
            "pipeline": "artifacts/heart_disease_pipeline.joblib",
            "metrics": "artifacts/metrics.json",
            "feature_schema": "artifacts/feature_schema.json",
            "metadata": "artifacts/model_metadata.json",
        },
        "intended_use": (
            "Academic demonstration of a supervised classification workflow. "
            "Not a medical device and not validated for clinical decision-making."
        ),
        "limitations": [
            "Only 303 records from a single 1980s Cleveland cohort; results may not generalise.",
            "The target reflects angiographic disease presence, not future heart-disease risk.",
            "The small 61-patient holdout makes metrics, especially calibration, uncertain.",
            "The 0.5 decision threshold is a default and was not selected for clinical utility.",
            "No external or temporal validation was performed.",
            "Probability outputs are model scores and have not been clinically calibrated.",
        ],
    }

    base_metrics = {
        "model_comparison": comparison,
        "selection": selection,
        "threshold": 0.5,
    }
    metrics = evaluate_and_save(
        final_pipeline, X_test, y_test, base_metrics, output_dir=ARTIFACTS_DIR
    )
    _write_json(METADATA_PATH, metadata)

    test_metrics = metrics["test_evaluation"]["metrics"]
    print("=" * 72)
    print(
        "Held-out test: "
        f"accuracy={test_metrics['accuracy']:.3f} | "
        f"precision={test_metrics['precision']:.3f} | "
        f"recall={test_metrics['recall']:.3f} | "
        f"F1={test_metrics['f1']:.3f} | "
        f"ROC-AUC={test_metrics['roc_auc']:.3f}"
    )
    print(f"Saved pipeline: {PIPELINE_PATH}")
    print(f"Saved metrics:  {METRICS_PATH}")
    print(f"Saved schema:   {SCHEMA_PATH}")
    print(f"Saved metadata: {METADATA_PATH}")


if __name__ == "__main__":
    main()
