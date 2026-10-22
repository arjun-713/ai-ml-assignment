"""Shared fixtures for the training, artifact and export tests."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts"


@pytest.fixture(scope="session")
def artifacts_dir() -> Path:
    return ARTIFACTS_DIR


@pytest.fixture(scope="session")
def pipeline():
    return joblib.load(ARTIFACTS_DIR / "heart_disease_pipeline.joblib")


@pytest.fixture(scope="session")
def feature_schema() -> dict:
    return json.loads((ARTIFACTS_DIR / "feature_schema.json").read_text())


@pytest.fixture(scope="session")
def metadata() -> dict:
    return json.loads((ARTIFACTS_DIR / "model_metadata.json").read_text())


@pytest.fixture(scope="session")
def metrics() -> dict:
    return json.loads((ARTIFACTS_DIR / "metrics.json").read_text())


@pytest.fixture(scope="session")
def model_bundle() -> dict:
    return json.loads((ARTIFACTS_DIR / "model_bundle.json").read_text())


@pytest.fixture(scope="session")
def parity_fixture() -> dict:
    path = PROJECT_ROOT / "src" / "lib" / "model" / "__fixtures__" / "parity.json"
    return json.loads(path.read_text())


@pytest.fixture
def valid_patient() -> dict:
    """A complete, real profile from the UCI cohort (disease-indicated)."""
    return {
        "age": 63,
        "sex": 1,
        "cp": 4,
        "trestbps": 145,
        "chol": 233,
        "fbs": 1,
        "restecg": 2,
        "thalach": 150,
        "exang": 0,
        "oldpeak": 2.3,
        "slope": 3,
        "ca": 0,
        "thal": 6,
    }
