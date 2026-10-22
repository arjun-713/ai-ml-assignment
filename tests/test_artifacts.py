"""Consistency and reproducibility checks for the committed artifacts."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import pytest
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

from ml.dataset import (
    FEATURE_NAMES,
    TARGET_DESCRIPTION,
    load_raw_dataset,
    prepare_dataset,
    split_dataset,
)

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def test_pipeline_accepts_the_13_documented_features_in_order(
    pipeline, feature_schema
) -> None:
    assert feature_schema["model_input_order"] == FEATURE_NAMES
    assert {field["key"] for field in feature_schema["features"]} == set(FEATURE_NAMES)
    assert list(pipeline.feature_names_in_) == FEATURE_NAMES
    assert len(feature_schema["features"]) == 13
    assert feature_schema["target"]["description"] == TARGET_DESCRIPTION


def test_metadata_matches_the_selected_model_and_dataset(pipeline, metadata) -> None:
    assert metadata["selected_model"]["key"] == "logistic_regression"
    assert metadata["selected_model"]["training_threshold"] == 0.5
    assert metadata["validation"]["test_set_used_for_selection"] is False
    assert metadata["validation"]["random_seed"] == 42
    assert metadata["validation"]["cv_folds"] == 5
    assert metadata["dataset"]["n_rows"] == 303
    assert metadata["dataset"]["class_counts"] == {"no_disease": 164, "disease": 139}

    raw_path = PROJECT_ROOT / metadata["dataset"]["raw_file"]
    digest = hashlib.sha256(raw_path.read_bytes()).hexdigest()
    assert digest == metadata["dataset"]["sha256"]

    classifier = pipeline.named_steps["classifier"]
    for parameter, value in metadata["selected_model"]["hyperparameters"].items():
        assert getattr(classifier, parameter) == value


def test_dataset_checksum_is_stable() -> None:
    frame = load_raw_dataset()
    assert frame.shape == (303, 14)
    assert int(frame["num"].gt(0).sum()) == 139


def test_reported_test_metrics_recompute_from_the_saved_pipeline(
    pipeline, metrics, feature_schema
) -> None:
    features, target = prepare_dataset(load_raw_dataset())
    _, X_test, _, y_test = split_dataset(features, target)

    stored_indices = metrics["split"]["test_row_indices"]
    assert X_test.index.tolist() == stored_indices
    assert len(stored_indices) == 61

    probabilities = pipeline.predict_proba(X_test[FEATURE_NAMES])[:, 1]
    predictions = (probabilities >= metrics["threshold"]).astype(int)
    reported = metrics["test_evaluation"]["metrics"]

    recomputed = {
        "accuracy": accuracy_score(y_test, predictions),
        "precision": precision_score(y_test, predictions, zero_division=0),
        "recall": recall_score(y_test, predictions, zero_division=0),
        "f1": f1_score(y_test, predictions, zero_division=0),
        "roc_auc": roc_auc_score(y_test, probabilities),
    }
    for key, value in recomputed.items():
        assert reported[key] == pytest.approx(value, abs=1e-4)

    tn, fp, fn, tp = confusion_matrix(y_test, predictions).ravel()
    confusion = metrics["test_evaluation"]["confusion_matrix"]
    assert (tn, fp, fn, tp) == (confusion["tn"], confusion["fp"], confusion["fn"], confusion["tp"])
    assert metrics["test_evaluation"]["held_out_probabilities"] == pytest.approx(
        np.round(probabilities, 4).tolist()
    )


def test_model_quality_meets_the_documented_acceptance_floor(metrics) -> None:
    scores = metrics["test_evaluation"]["metrics"]

    assert scores["roc_auc"] >= 0.90
    assert scores["recall"] >= 0.85
    assert scores["f1"] >= 0.80
    assert scores["accuracy"] >= 0.80


def test_selection_ranking_uses_cross_validated_f1(metrics) -> None:
    selection = metrics["selection"]
    rankings = selection["rankings"]

    assert len(rankings) == 3
    assert [row["rank"] for row in rankings] == [1, 2, 3]
    assert rankings[0]["model"] == selection["selected_model_name"]
    assert rankings[0]["cv_f1"] == selection["selected_cv_scores"]["f1"]["mean"]
    assert [row["cv_f1"] for row in rankings] == sorted(
        [row["cv_f1"] for row in rankings], reverse=True
    )


def test_schema_marks_ca_and_thal_optional_and_nullable(feature_schema) -> None:
    fields = {field["key"]: field for field in feature_schema["features"]}

    assert fields["ca"]["required"] is False
    assert fields["thal"]["required"] is False
    assert all(
        field["required"] is True
        for key, field in fields.items()
        if key not in {"ca", "thal"}
    )
    assert feature_schema["preprocessing"]["nullable_fields"] == ["ca", "thal"]


def test_next_bundle_reproduces_the_fitted_preprocessing(
    pipeline, model_bundle
) -> None:
    preprocessor = pipeline.named_steps["preprocessor"]
    numeric = preprocessor.named_transformers_["num"]
    categorical = preprocessor.named_transformers_["cat"]
    exported = model_bundle["preprocessing"]

    assert exported["numeric_features"] == list(numeric.feature_names_in_)
    assert exported["numeric_impute"] == pytest.approx(
        numeric.named_steps["imputer"].statistics_.tolist()
    )
    assert exported["numeric_mean"] == pytest.approx(
        numeric.named_steps["scaler"].mean_.tolist()
    )
    assert exported["numeric_scale"] == pytest.approx(
        numeric.named_steps["scaler"].scale_.tolist()
    )
    assert exported["categorical_features"] == list(categorical.feature_names_in_)
    assert exported["categorical_impute"] == pytest.approx(
        categorical.named_steps["imputer"].statistics_.tolist()
    )
    assert exported["categorical_categories"] == [
        values.tolist() for values in categorical.named_steps["onehot"].categories_
    ]
    assert exported["output_feature_names"] == list(
        preprocessor.get_feature_names_out()
    )


def test_next_bundle_matches_the_logistic_coefficients(
    pipeline, model_bundle, metadata
) -> None:
    classifier = pipeline.named_steps["classifier"]
    exported = model_bundle["classifier"]

    assert exported["classes"] == classifier.classes_.astype(int).tolist()
    assert exported["intercept"] == pytest.approx(float(classifier.intercept_[0]))
    assert exported["coefficients"] == pytest.approx(classifier.coef_[0].tolist())
    assert model_bundle["model"]["key"] == metadata["selected_model"]["key"]
    assert model_bundle["model"]["threshold"] == 0.5
    assert (
        model_bundle["model_info"]["test_metrics"]
        == json.loads((PROJECT_ROOT / "artifacts" / "metrics.json").read_text())[
            "test_evaluation"
        ]["metrics"]
    )


def test_parity_fixture_covers_every_cohort_row(
    pipeline, parity_fixture, feature_schema
) -> None:
    frame = load_raw_dataset()
    features, _ = prepare_dataset(frame)
    probabilities = pipeline.predict_proba(features[FEATURE_NAMES])[:, 1]

    assert len(parity_fixture["rows"]) == 303
    assert parity_fixture["threshold"] == 0.5
    assert feature_schema["model_input_order"] == FEATURE_NAMES

    for index, row in enumerate(parity_fixture["rows"]):
        assert row["probability"] == pytest.approx(
            float(probabilities[index]), abs=1e-9
        )


def test_declared_artifact_paths_exist(metadata) -> None:
    for relative_path in metadata["artifacts"].values():
        assert (PROJECT_ROOT / relative_path).is_file(), relative_path
    assert (PROJECT_ROOT / "artifacts" / "model_bundle.json").is_file()
    assert (
        PROJECT_ROOT / "src" / "lib" / "model" / "__fixtures__" / "parity.json"
    ).is_file()
