"""Single-model inference wrapper.

The complete preprocessing + classification pipeline is loaded once at API
startup. No patient data is persisted or logged.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


class ArtifactLoadError(RuntimeError):
    """Raised when a required training artifact is missing or inconsistent."""


class PredictionError(RuntimeError):
    """Raised when the fitted pipeline cannot score a valid request."""


class HeartDiseasePredictor:
    def __init__(self, artifacts_dir: str | Path | None = None) -> None:
        project_root = Path(__file__).resolve().parents[1]
        self.artifacts_dir = Path(
            artifacts_dir
            or os.environ.get("HEART_ARTIFACTS_DIR")
            or project_root / "artifacts"
        )
        self._load_artifacts()

    def _read_json(self, name: str) -> dict:
        path = self.artifacts_dir / name
        if not path.exists():
            raise ArtifactLoadError(
                f"Missing artifact: {path}. Run `python -m ml.train` from the project root."
            )
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ArtifactLoadError(f"Malformed JSON artifact: {path}") from exc

    def _load_artifacts(self) -> None:
        pipeline_path = self.artifacts_dir / "heart_disease_pipeline.joblib"
        if not pipeline_path.exists():
            raise ArtifactLoadError(
                f"Missing pipeline: {pipeline_path}. Run `python -m ml.train` first."
            )

        self.pipeline = joblib.load(pipeline_path)
        self.metadata = self._read_json("model_metadata.json")
        self.metrics = self._read_json("metrics.json")
        self.feature_schema = self._read_json("feature_schema.json")

        self.feature_names = list(self.feature_schema["model_input_order"])
        if len(self.feature_names) != 13:
            raise ArtifactLoadError("Feature schema must contain exactly 13 predictors.")
        if not hasattr(self.pipeline, "predict_proba"):
            raise ArtifactLoadError("Loaded pipeline does not expose predict_proba.")

        pipeline_features = getattr(self.pipeline, "feature_names_in_", None)
        if pipeline_features is not None:
            pipeline_features = list(pipeline_features)
            if pipeline_features != self.feature_names:
                raise ArtifactLoadError(
                    "Feature schema order does not match the fitted pipeline."
                )

        self.model_key = self.metadata["selected_model"]["key"]
        self.model_label = self.metadata["selected_model"]["label"]
        self.model_version = self.metadata["model_version"]
        self.threshold = float(
            self.metadata["selected_model"].get("training_threshold", 0.5)
        )
        self.feature_schema_by_key = {
            field["key"]: field for field in self.feature_schema["features"]
        }
        self.preprocessor = self.pipeline.named_steps["preprocessor"]
        self.classifier = self.pipeline.named_steps["classifier"]
        self._is_linear = hasattr(self.classifier, "coef_")
        self._output_feature_names = list(self.preprocessor.get_feature_names_out())

    def model_info(self) -> dict:
        test = self.metrics["test_evaluation"]
        return {
            "model": {
                "key": self.model_key,
                "label": self.model_label,
                "version": self.model_version,
                "trained_at_utc": self.metadata.get("trained_at_utc"),
                "threshold": self.threshold,
                "hyperparameters": self.metadata["selected_model"].get(
                    "hyperparameters", {}
                ),
            },
            "selection": self.metrics.get("selection", {}),
            "validation": self.metadata.get("validation", {}),
            "test_metrics": test["metrics"],
            "comparison": self.metrics.get("model_comparison", []),
            "confusion_matrix": test["confusion_matrix"],
            "roc_curve": test["roc_curve"],
            "calibration": test["calibration"],
            "classification_report": test["classification_report"],
            "permutation_importance": test["permutation_importance"],
            "coefficient_analysis": test["coefficient_analysis"],
            "dataset": self.metrics.get("dataset", {}),
            "features": self.feature_schema["features"],
            "preprocessing": self.feature_schema["preprocessing"],
            "dataset_info": self.metadata.get("dataset", {}),
            "limitations": self.metadata.get("limitations", []),
            "intended_use": self.metadata.get("intended_use", ""),
            "target_definition": self.feature_schema["target"]["description"],
            "disclaimer": self._disclaimer(),
        }

    def _format_value(self, feature: str, value: object) -> str:
        if value is None:
            return "Not recorded"
        field = self.feature_schema_by_key[feature]
        options = field.get("options")
        if options:
            for option in options:
                if option["value"] == value:
                    return option["label"]
        unit = field.get("unit")
        return f"{value} {unit}" if unit else str(value)

    def _contributions(self, frame: pd.DataFrame) -> list[dict]:
        """Local linear contributions, grouped back to the 13 input features.

        Logistic regression predicts log-odds = intercept + sum(coef * x). The
        returned values are those additive terms, so they explain this model's
        output for this input. They are not causal effects or clinical risks.
        """
        if not self._is_linear:
            return []

        try:
            transformed = np.asarray(self.preprocessor.transform(frame))[0]
        except Exception:
            return []

        coefficients = np.asarray(self.classifier.coef_)[0]
        grouped: dict[str, dict] = {}

        for name, value, coefficient in zip(
            self._output_feature_names, transformed, coefficients
        ):
            prefix, term = name.split("__", 1)
            if prefix == "num":
                feature = term
                contribution = float(coefficient * value)
                term_label = self.feature_schema_by_key[feature]["label"]
            else:
                feature = term.split("_", 1)[0]
                contribution = float(coefficient * value)
                raw_value = frame.iloc[0][feature]
                if raw_value is None or pd.isna(raw_value):
                    term_label = (
                        f"{self.feature_schema_by_key[feature]['label']} "
                        "(imputed from training data)"
                    )
                else:
                    term_label = (
                        f"{self.feature_schema_by_key[feature]['label']}: "
                        f"{self._format_value(feature, raw_value)}"
                    )

            # One-hot columns for inactive categories have value 0 and add no
            # local contribution; numeric features have a single active term.
            if feature not in grouped:
                grouped[feature] = {
                    "feature": feature,
                    "label": self.feature_schema_by_key[feature]["label"],
                    "term_label": term_label,
                    "value": self._format_value(feature, frame.iloc[0][feature]),
                    "_contribution": 0.0,
                }
            if abs(contribution) > abs(grouped[feature]["_contribution"]):
                grouped[feature]["_contribution"] = contribution
                if prefix == "cat" and (
                    frame.iloc[0][feature] is not None
                    and not pd.isna(frame.iloc[0][feature])
                ):
                    grouped[feature]["term_label"] = term_label

        max_strength = max(
            (abs(item["_contribution"]) for item in grouped.values()), default=1.0
        )
        max_strength = max_strength or 1.0

        contributions = []
        for item in grouped.values():
            contribution = item.pop("_contribution")
            detail = item.pop("term_label")
            contributions.append(
                {
                    **item,
                    "detail": detail,
                    "log_odds_contribution": round(contribution, 3),
                    "direction": (
                        "toward_disease"
                        if contribution > 0
                        else "toward_no_disease"
                    ),
                    "relative_strength": round(
                        min(abs(contribution) / max_strength, 1.0), 3
                    ),
                }
            )
        contributions.sort(
            key=lambda item: abs(item["log_odds_contribution"]), reverse=True
        )
        return contributions[:4]

    def predict(self, features: dict) -> dict:
        if set(features) != set(self.feature_names):
            missing = sorted(set(self.feature_names) - set(features))
            extra = sorted(set(features) - set(self.feature_names))
            raise PredictionError(
                f"Feature mismatch. Missing: {missing}; unexpected: {extra}."
            )

        frame = pd.DataFrame(
            [{name: features[name] for name in self.feature_names}],
            columns=self.feature_names,
        )

        try:
            probability = float(self.pipeline.predict_proba(frame)[0, 1])
        except Exception as exc:  # pragma: no cover - defensive boundary
            raise PredictionError("The model could not score this input.") from exc

        if not np.isfinite(probability) or not 0.0 <= probability <= 1.0:
            raise PredictionError("The model returned an invalid probability.")

        prediction = int(probability >= self.threshold)
        contributions = self._contributions(frame)
        if prediction == 1:
            classification = "Disease pattern indicated"
            explanation = (
                "The model's estimated probability is at or above the 0.5 decision "
                "threshold, so it classifies this profile in the disease-indicated "
                "class. The input values should be reviewed alongside the "
                "contributing factors rather than treated as a diagnosis."
            )
        else:
            classification = "No disease pattern indicated"
            explanation = (
                "The model's estimated probability is below the 0.5 decision "
                "threshold, so it classifies this profile in the no-disease class. "
                "A below-threshold score does not rule out coronary artery disease."
            )

        return {
            "prediction": prediction,
            "classification": classification,
            "probability": round(probability, 4),
            "probability_note": (
                "This is the model's estimated probability for the disease-indicated "
                "class on the held-out Cleveland cohort. It is not a clinically "
                "calibrated risk and is not the chance of developing heart disease "
                "in the future."
            ),
            "threshold": self.threshold,
            "model": {
                "key": self.model_key,
                "label": self.model_label,
                "version": self.model_version,
                "threshold": self.threshold,
            },
            "contributions": contributions,
            "explanation": explanation,
            "disclaimer": self._disclaimer(),
            "target_definition": self.feature_schema["target"]["description"],
        }

    @staticmethod
    def _disclaimer() -> str:
        return (
            "Educational decision-support demo only. This output is not a medical "
            "diagnosis, not a clinically validated risk score, and must not be used "
            "to guide patient care. Consult a qualified clinician for any medical "
            "concern."
        )
