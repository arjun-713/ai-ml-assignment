"""Input/output contracts for the heart disease prediction API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PatientFeatures(BaseModel):
    """The 13 original UCI Cleveland predictors.

    Categorical fields use the original UCI codes. `ca` and `thal` may be
    omitted because 4 and 2 records respectively were missing in the official
    file; the training pipeline contains fitted imputers for them.
    """

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
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
        },
    )

    age: int = Field(
        ...,
        ge=18,
        le=100,
        description="Age in years.",
        examples=[63],
    )
    sex: Literal[0, 1] = Field(
        ...,
        description="Biological sex (0 = female, 1 = male).",
    )
    cp: Literal[1, 2, 3, 4] = Field(
        ...,
        description="Chest pain type: 1 typical angina, 2 atypical angina, 3 non-anginal, 4 asymptomatic.",
    )
    trestbps: int = Field(
        ...,
        ge=80,
        le=250,
        description="Resting systolic blood pressure on admission (mm Hg).",
    )
    chol: int = Field(
        ...,
        ge=100,
        le=600,
        description="Serum cholesterol (mg/dL).",
    )
    fbs: Literal[0, 1] = Field(
        ...,
        description="Fasting blood sugar > 120 mg/dL (0 = no, 1 = yes).",
    )
    restecg: Literal[0, 1, 2] = Field(
        ...,
        description="Resting ECG: 0 normal, 1 ST-T abnormality, 2 probable/definite LVH.",
    )
    thalach: int = Field(
        ...,
        ge=50,
        le=220,
        description="Maximum heart rate achieved during the exercise test (bpm).",
    )
    exang: Literal[0, 1] = Field(
        ...,
        description="Exercise-induced angina (0 = no, 1 = yes).",
    )
    oldpeak: float = Field(
        ...,
        ge=0,
        le=10,
        description="ST depression induced by exercise relative to rest (mm).",
    )
    slope: Literal[1, 2, 3] = Field(
        ...,
        description="Slope of peak-exercise ST segment: 1 upsloping, 2 flat, 3 downsloping.",
    )
    ca: Literal[0, 1, 2, 3] | None = Field(
        default=None,
        description="Number of major vessels (0–3) coloured by fluoroscopy; nullable.",
    )
    thal: Literal[3, 6, 7] | None = Field(
        default=None,
        description="Thallium test: 3 normal, 6 fixed defect, 7 reversible defect; nullable.",
    )


class ModelSummary(BaseModel):
    key: str
    label: str
    version: str
    threshold: float


class Contribution(BaseModel):
    feature: str
    label: str
    value: str
    log_odds_contribution: float
    direction: Literal["toward_disease", "toward_no_disease"]
    relative_strength: float = Field(
        ge=0,
        le=1,
        description="Absolute contribution scaled to the largest displayed contribution.",
    )


class PredictionResult(BaseModel):
    prediction: Literal[0, 1]
    classification: str
    probability: float = Field(ge=0, le=1)
    probability_note: str
    threshold: float
    model: ModelSummary
    contributions: list[Contribution]
    explanation: str
    disclaimer: str
    target_definition: str


class HealthResponse(BaseModel):
    status: Literal["ok", "starting", "error"]
    model_loaded: bool
    model: str | None = None
    version: str | None = None
    detail: str | None = None


class ModelInfoResponse(BaseModel):
    model: dict
    selection: dict
    validation: dict
    test_metrics: dict
    comparison: list[dict]
    confusion_matrix: dict
    roc_curve: dict
    calibration: dict
    classification_report: dict
    permutation_importance: list[dict]
    coefficient_analysis: dict
    dataset: dict
    features: list[dict]
    preprocessing: dict
    dataset_info: dict
    limitations: list[str]
    intended_use: str
    target_definition: str
    disclaimer: str
