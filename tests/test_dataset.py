"""Tests for the official dataset loader, target and leakage-safe split."""

from __future__ import annotations

import pandas as pd
import pytest

from ml.dataset import (
    CATEGORICAL_FEATURES,
    FEATURE_NAMES,
    NUMERIC_FEATURES,
    load_raw_dataset,
    prepare_dataset,
    split_dataset,
)


def test_official_file_has_expected_shape_and_missing_cells() -> None:
    frame = load_raw_dataset()

    assert frame.shape == (303, 14)
    assert list(frame.columns) == FEATURE_NAMES + ["num"]
    assert frame.isna().sum().sum() == 6
    assert frame["ca"].isna().sum() == 4
    assert frame["thal"].isna().sum() == 2
    assert set(frame["num"].unique()) == {0, 1, 2, 3, 4}


def test_target_is_binary_angiographic_disease_presence() -> None:
    frame = load_raw_dataset()
    features, target = prepare_dataset(frame)

    assert features.shape == (303, 13)
    assert list(features.columns) == FEATURE_NAMES
    assert target.name == "disease"
    assert target.isin([0, 1]).all()
    assert int(target.sum()) == 139
    assert int((target == 0).sum()) == 164
    # The original 4-level ordinal target must not leak into feature columns.
    assert "num" not in features.columns


def test_split_is_stratified_seeded_and_disjoint() -> None:
    features, target = prepare_dataset(load_raw_dataset())

    X_train, X_test, y_train, y_test = split_dataset(features, target)
    second_split = split_dataset(features, target)

    assert len(X_train) == 242
    assert len(X_test) == 61
    assert len(y_train) == 242
    assert len(y_test) == 61
    assert set(X_train.index).isdisjoint(set(X_test.index))
    assert sorted([*X_train.index, *X_test.index]) == list(range(303))
    assert int(y_train.sum()) == 111
    assert int(y_test.sum()) == 28
    assert X_train.index.tolist() == second_split[0].index.tolist()
    assert X_test.index.tolist() == second_split[1].index.tolist()
    assert y_train.tolist() == second_split[2].tolist()


def test_feature_partition_covers_all_predictors_once() -> None:
    assert set(NUMERIC_FEATURES) | set(CATEGORICAL_FEATURES) == set(FEATURE_NAMES)
    assert set(NUMERIC_FEATURES) & set(CATEGORICAL_FEATURES) == set()


def test_preprocessing_is_fitted_inside_the_pipeline(pipeline) -> None:
    """The saved pipeline must expose one fitted preprocessor, not raw inputs."""
    assert list(pipeline.named_steps) == ["preprocessor", "classifier"]
    preprocessor = pipeline.named_steps["preprocessor"]
    assert preprocessor.transformers[0][0] == "num"
    assert preprocessor.transformers[1][0] == "cat"

    numeric_imputer = preprocessor.named_transformers_["num"].named_steps["imputer"]
    X_train, _, _, _ = split_dataset(*prepare_dataset(load_raw_dataset()))

    for index, feature in enumerate(preprocessor.transformers[0][2]):
        assert numeric_imputer.statistics_[index] == pytest.approx(
            X_train[feature].median()
        )

    categorical_imputer = (
        preprocessor.named_transformers_["cat"].named_steps["imputer"]
    )
    for index, feature in enumerate(preprocessor.transformers[1][2]):
        assert categorical_imputer.statistics_[index] == X_train[feature].mode().iloc[0]


def test_pipeline_imputes_missing_optional_fields(pipeline, valid_patient) -> None:
    columns = list(pipeline.feature_names_in_)
    base = pd.DataFrame([valid_patient], columns=columns)

    incomplete = base.copy()
    incomplete.loc[0, "ca"] = None
    incomplete.loc[0, "thal"] = None

    probabilities = pipeline.predict_proba(incomplete)

    assert probabilities.shape == (1, 2)
    assert probabilities[0, 1] == pytest.approx(probabilities[0, 1])
    assert 0.0 <= probabilities[0, 1] <= 1.0
