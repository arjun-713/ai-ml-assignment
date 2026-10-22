"""End-to-end API contract tests using the real fitted pipeline."""

from __future__ import annotations

import pandas as pd
import pytest

from backend.predictor import HeartDiseasePredictor
from ml.dataset import FEATURE_NAMES

NEGATIVE_PATIENT = {
    "age": 41,
    "sex": 0,
    "cp": 2,
    "trestbps": 130,
    "chol": 204,
    "fbs": 0,
    "restecg": 2,
    "thalach": 172,
    "exang": 0,
    "oldpeak": 1.4,
    "slope": 1,
    "ca": 0,
    "thal": 3,
}


def test_health_reports_the_loaded_model(client) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        "status": "ok",
        "model_loaded": True,
        "model": "Logistic Regression",
        "version": "1.0.0",
        "detail": None,
    }


def test_model_info_exposes_metrics_and_schema(client, metrics, metadata) -> None:
    response = client.get("/api/model-info")

    assert response.status_code == 200
    payload = response.json()
    assert payload["model"]["key"] == "logistic_regression"
    assert payload["model"]["version"] == "1.0.0"
    assert payload["validation"]["test_set_used_for_selection"] is False
    assert payload["test_metrics"] == metrics["test_evaluation"]["metrics"]
    assert len(payload["comparison"]) == 3
    assert len(payload["confusion_matrix"]["matrix"]) == 2
    assert payload["dataset"]["n_rows"] == 303
    assert payload["dataset_info"]["sha256"] == metadata["dataset"]["sha256"]
    assert len(payload["features"]) == 13
    assert payload["features"][0]["key"] == "age"
    assert "angiographic" in payload["target_definition"]
    assert len(payload["limitations"]) >= 4
    assert payload["roc_curve"]["auc"] == pytest.approx(payload["test_metrics"]["roc_auc"])


def test_predict_returns_a_real_thresholded_probability(
    client, pipeline, valid_patient
) -> None:
    response = client.post("/api/predict", json=valid_patient)

    assert response.status_code == 200
    payload = response.json()
    frame = pd.DataFrame([valid_patient], columns=FEATURE_NAMES)
    expected_probability = float(pipeline.predict_proba(frame)[0, 1])

    assert payload["probability"] == pytest.approx(round(expected_probability, 4))
    assert payload["prediction"] == int(expected_probability >= payload["threshold"])
    assert 0.0 <= payload["probability"] <= 1.0
    assert payload["model"]["label"] == "Logistic Regression"
    assert payload["threshold"] == 0.5
    assert "not a medical diagnosis" in payload["disclaimer"].lower()
    assert "future" in payload["probability_note"].lower()


def test_positive_and_negative_profiles_produce_different_classes(
    client, valid_patient
) -> None:
    positive = client.post("/api/predict", json=valid_patient)
    negative = client.post("/api/predict", json=NEGATIVE_PATIENT)

    assert positive.status_code == 200
    assert negative.status_code == 200
    assert positive.json()["prediction"] == 1
    assert positive.json()["probability"] > 0.5
    assert negative.json()["prediction"] == 0
    assert negative.json()["probability"] < 0.5
    assert positive.json()["explanation"] != negative.json()["explanation"]


def test_local_contributions_are_bounded_sorted_and_unique(client, valid_patient) -> None:
    payload = client.post("/api/predict", json=valid_patient).json()
    contributions = payload["contributions"]

    assert 1 <= len(contributions) <= 4
    assert len({item["feature"] for item in contributions}) == len(contributions)
    assert {item["feature"] for item in contributions} <= set(FEATURE_NAMES)
    strengths = [abs(item["log_odds_contribution"]) for item in contributions]
    assert strengths == sorted(strengths, reverse=True)
    assert max(item["relative_strength"] for item in contributions) == 1.0
    for item in contributions:
        assert 0.0 <= item["relative_strength"] <= 1.0
        if item["log_odds_contribution"] > 0:
            assert item["direction"] == "toward_disease"
        else:
            assert item["direction"] == "toward_no_disease"


def test_optional_features_can_be_omitted_or_null(client, valid_patient) -> None:
    omitted = {key: value for key, value in valid_patient.items() if key not in {"ca", "thal"}}
    explicit_null = {**valid_patient, "ca": None, "thal": None}

    omitted_response = client.post("/api/predict", json=omitted)
    null_response = client.post("/api/predict", json=explicit_null)

    assert omitted_response.status_code == 200
    assert null_response.status_code == 200
    assert omitted_response.json()["probability"] == pytest.approx(
        null_response.json()["probability"]
    )


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("age", 17),
        ("age", 101),
        ("sex", 2),
        ("cp", 0),
        ("cp", 5),
        ("trestbps", 79),
        ("chol", 601),
        ("fbs", 2),
        ("restecg", 3),
        ("thalach", 49),
        ("exang", -1),
        ("oldpeak", -0.1),
        ("slope", 4),
        ("ca", 4),
        ("thal", 1),
    ],
)
def test_out_of_contract_values_return_422(client, valid_patient, field, value) -> None:
    invalid = {**valid_patient, field: value}

    response = client.post("/api/predict", json=invalid)

    assert response.status_code == 422
    body = response.json()
    assert body["detail"].startswith("Some input values are invalid")
    assert any(error["field"] == field for error in body["errors"])


def test_missing_required_feature_returns_a_field_error(client, valid_patient) -> None:
    incomplete = {key: value for key, value in valid_patient.items() if key != "age"}

    response = client.post("/api/predict", json=incomplete)

    assert response.status_code == 422
    assert {error["field"] for error in response.json()["errors"]} == {"age"}


def test_unknown_fields_are_rejected(client, valid_patient) -> None:
    response = client.post("/api/predict", json={**valid_patient, "smoker": True})

    assert response.status_code == 422
    assert any(error["field"] == "smoker" for error in response.json()["errors"])


def test_same_request_is_deterministic(client, valid_patient) -> None:
    first = client.post("/api/predict", json=valid_patient).json()
    second = client.post("/api/predict", json=valid_patient).json()

    assert first == second


def test_cors_allows_the_local_frontend(client) -> None:
    response = client.options(
        "/api/predict",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "POST" in response.headers["access-control-allow-methods"]


def test_openapi_documents_all_three_endpoints(client) -> None:
    schema = client.get("/openapi.json").json()

    assert {"/api/health", "/api/model-info", "/api/predict"} <= set(schema["paths"])
    prediction_schema = schema["components"]["schemas"]["PatientFeatures"]
    assert set(prediction_schema["required"]) == set(FEATURE_NAMES) - {"ca", "thal"}
    assert "ca" not in prediction_schema["required"]
    assert "thal" not in prediction_schema["required"]


def test_predictor_constructor_loads_the_same_artifact_as_the_api(client) -> None:
    predictor = HeartDiseasePredictor()

    assert predictor.model_label == "Logistic Regression"
    assert predictor.feature_names == FEATURE_NAMES
    info = predictor.model_info()
    assert info["model"]["key"] == "logistic_regression"
    assert len(info["permutation_importance"]) == 13
