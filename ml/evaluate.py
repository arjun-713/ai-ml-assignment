"""Held-out evaluation and model-analysis artifacts.

Run after training to regenerate ``artifacts/metrics.json`` and evaluation plots
from the saved pipeline:

    python ml/evaluate.py
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.calibration import calibration_curve
from sklearn.inspection import permutation_importance
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)

from ml.dataset import (
    ARTIFACTS_DIR,
    CATEGORICAL_FEATURES,
    CLASS_NAMES,
    FEATURE_NAMES,
    FEATURE_SCHEMA,
    FEATURE_SCHEMA_BY_KEY,
    PLOTS_DIR,
    RANDOM_SEED,
    TEST_SIZE,
    dataset_fingerprint,
    load_raw_dataset,
    prepare_dataset,
    split_dataset,
)

PIPELINE_PATH = ARTIFACTS_DIR / "heart_disease_pipeline.joblib"
METRICS_PATH = ARTIFACTS_DIR / "metrics.json"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"
THRESHOLD = 0.5

COLORS = {
    "ink": "#16302b",
    "teal": "#0f5c50",
    "teal_light": "#5b9c8c",
    "coral": "#c4553b",
    "gold": "#c99a3f",
    "muted": "#7b8b84",
    "grid": "#dfe6e1",
    "background": "#f7f6f1",
}


def _round(value: float, digits: int = 4) -> float:
    return round(float(value), digits)


def _style_axes(ax: plt.Axes) -> None:
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(COLORS["grid"])
    ax.spines["bottom"].set_color(COLORS["grid"])
    ax.tick_params(colors=COLORS["muted"], labelsize=9)
    ax.grid(axis="y", color=COLORS["grid"], linewidth=0.8, alpha=0.8)
    ax.set_axisbelow(True)


def build_dataset_profile(df: pd.DataFrame) -> dict:
    """Dataset summary and univariate associations used on the insights page."""
    X, y = prepare_dataset(df)
    profile = dataset_fingerprint(df)

    corr_frame = X.copy()
    corr_frame["target"] = y
    corr = corr_frame.corr(numeric_only=True)
    profile["correlation"] = {
        "features": list(corr.columns),
        "labels": [
            FEATURE_SCHEMA_BY_KEY[column]["label"] for column in FEATURE_NAMES
        ]
        + ["Disease indicated"],
        "matrix": np.round(corr.to_numpy(), 3).tolist(),
    }

    categorical_associations = []
    for feature in CATEGORICAL_FEATURES + ["ca"]:
        field = FEATURE_SCHEMA_BY_KEY[feature]
        groups = []
        for option in field["options"]:
            mask = X[feature] == option["value"]
            groups.append(
                {
                    "label": option["label"],
                    "n": int(mask.sum()),
                    "disease_rate": _round(y[mask].mean()) if mask.any() else None,
                }
            )
        categorical_associations.append(
            {
                "feature": feature,
                "label": field["label"],
                "groups": groups,
            }
        )
    profile["categorical_associations"] = categorical_associations

    numeric_by_class = []
    for feature in ["age", "trestbps", "chol", "thalach", "oldpeak", "ca"]:
        field = FEATURE_SCHEMA_BY_KEY[feature]
        numeric_by_class.append(
            {
                "feature": feature,
                "label": field["label"],
                "unit": field["unit"],
                "no_disease_mean": _round(X.loc[y == 0, feature].mean(), 2),
                "disease_mean": _round(X.loc[y == 1, feature].mean(), 2),
                "overall_median": _round(X[feature].median(), 2),
                "overall_min": _round(X[feature].min(), 2),
                "overall_max": _round(X[feature].max(), 2),
            }
        )
    profile["numeric_by_class"] = numeric_by_class
    return profile


def compute_test_metrics(
    pipeline, X_test: pd.DataFrame, y_test: pd.Series, threshold: float = THRESHOLD
) -> dict:
    """Compute all reported metrics from a fitted pipeline and held-out data."""
    probabilities = pipeline.predict_proba(X_test)[:, 1]
    predictions = (probabilities >= threshold).astype(int)

    cm = confusion_matrix(y_test, predictions, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    report = classification_report(
        y_test,
        predictions,
        labels=[0, 1],
        target_names=list(CLASS_NAMES),
        output_dict=True,
        zero_division=0,
    )

    fpr, tpr, _ = roc_curve(y_test, probabilities)
    fraction_positive, mean_predicted = calibration_curve(
        y_test, probabilities, n_bins=6, strategy="uniform"
    )

    metrics = {
        "accuracy": _round(accuracy_score(y_test, predictions)),
        "precision": _round(precision_score(y_test, predictions, zero_division=0)),
        "recall": _round(recall_score(y_test, predictions, zero_division=0)),
        "f1": _round(f1_score(y_test, predictions, zero_division=0)),
        "roc_auc": _round(roc_auc_score(y_test, probabilities)),
    }

    report_clean = {
        "no_disease": {
            key: _round(report[CLASS_NAMES[0]][key])
            for key in ["precision", "recall", "f1-score"]
        }
        | {"support": int(report[CLASS_NAMES[0]]["support"])},
        "disease": {
            key: _round(report[CLASS_NAMES[1]][key])
            for key in ["precision", "recall", "f1-score"]
        }
        | {"support": int(report[CLASS_NAMES[1]]["support"])},
        "macro_avg": {
            key: _round(report["macro avg"][key])
            for key in ["precision", "recall", "f1-score"]
        }
        | {"support": int(report["macro avg"]["support"])},
        "weighted_avg": {
            key: _round(report["weighted avg"][key])
            for key in ["precision", "recall", "f1-score"]
        }
        | {"support": int(report["weighted avg"]["support"])},
    }

    return {
        "threshold": threshold,
        "metrics": metrics,
        "confusion_matrix": {
            "labels": list(CLASS_NAMES),
            "matrix": cm.tolist(),
            "tn": int(tn),
            "fp": int(fp),
            "fn": int(fn),
            "tp": int(tp),
        },
        "classification_report": report_clean,
        "roc_curve": {
            "fpr": [_round(value) for value in fpr],
            "tpr": [_round(value) for value in tpr],
            "auc": _round(roc_auc_score(y_test, probabilities)),
        },
        "calibration": {
            "mean_predicted": [_round(value) for value in mean_predicted],
            "fraction_positive": [_round(value) for value in fraction_positive],
            "brier_score": _round(
                brier_score_loss(y_test, probabilities), 4
            ),
            "n_bins": 6,
            "note": (
                "Reliability is estimated from only 61 held-out patients. Bin-level "
                "points are unstable and the score is not a clinically calibrated risk."
            ),
        },
        "prediction_distribution": {
            "mean_probability": _round(probabilities.mean()),
            "min_probability": _round(probabilities.min()),
            "max_probability": _round(probabilities.max()),
            "predicted_positive": int(predictions.sum()),
            "observed_positive": int(y_test.sum()),
        },
        "held_out_probabilities": [_round(p) for p in probabilities],
    }


def compute_permutation_importance(
    pipeline, X_test: pd.DataFrame, y_test: pd.Series, n_repeats: int = 20
) -> list[dict]:
    result = permutation_importance(
        pipeline,
        X_test,
        y_test,
        scoring="roc_auc",
        n_repeats=n_repeats,
        random_state=RANDOM_SEED,
        n_jobs=1,
    )
    items = []
    for index, feature in enumerate(FEATURE_NAMES):
        items.append(
            {
                "feature": feature,
                "label": FEATURE_SCHEMA_BY_KEY[feature]["label"],
                "mean_decrease_roc_auc": _round(result.importances_mean[index]),
                "std": _round(result.importances_std[index]),
            }
        )
    return sorted(items, key=lambda item: item["mean_decrease_roc_auc"], reverse=True)


def compute_coefficient_analysis(pipeline) -> dict:
    """Expose linear coefficients, including a readable term label per column."""
    classifier = pipeline.named_steps["classifier"]
    preprocessor = pipeline.named_steps["preprocessor"]
    if not hasattr(classifier, "coef_"):
        return {"available": False, "reason": "Selected model is not a linear model."}

    names = preprocessor.get_feature_names_out()
    coefficients = classifier.coef_[0]
    terms = []
    for name, coefficient in zip(names, coefficients):
        prefix, term = name.split("__", 1)
        if prefix == "num":
            feature = term
            term_label = FEATURE_SCHEMA_BY_KEY[feature]["label"]
        else:
            feature = term.split("_", 1)[0]
            suffix = term.split("_", 1)[1]
            field = FEATURE_SCHEMA_BY_KEY[feature]
            option = next(
                (item for item in field.get("options", []) if str(item["value"]) == suffix),
                None,
            )
            term_label = (
                f"{field['label']}: {option['label']}" if option else field["label"]
            )
        terms.append(
            {
                "term": name,
                "feature": feature,
                "term_label": term_label,
                "coefficient": _round(coefficient),
                "odds_ratio": _round(float(np.exp(coefficient))),
            }
        )
    terms.sort(key=lambda item: abs(item["coefficient"]), reverse=True)
    return {
        "available": True,
        "intercept": _round(classifier.intercept_[0]),
        "terms": terms,
        "note": (
            "Coefficients are in log-odds units on the transformed (scaled or "
            "one-hot) feature space. A term's coefficient is not a causal effect."
        ),
    }


def save_plots(
    metrics: dict,
    pipeline,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    model_comparison: list[dict],
    output_dir: Path = PLOTS_DIR,
) -> dict[str, str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    sns.set_theme(style="white")
    plot_paths: dict[str, str] = {}

    # 1. Cross-validation comparison
    fig, ax = plt.subplots(figsize=(7.4, 4.0), dpi=180)
    metric_keys = ["accuracy", "precision", "recall", "f1", "roc_auc"]
    metric_labels = ["Accuracy", "Precision", "Recall", "F1", "ROC-AUC"]
    n_models = len(model_comparison)
    width = 0.8 / max(n_models, 1)
    positions = np.arange(len(metric_keys))
    palette = [COLORS["teal"], COLORS["gold"], COLORS["coral"]]
    for index, model in enumerate(model_comparison):
        means = [model["cv"][key]["mean"] for key in metric_keys]
        errors = [model["cv"][key]["std"] for key in metric_keys]
        ax.bar(
            positions + index * width - 0.4 + width / 2,
            means,
            width,
            yerr=errors,
            capsize=2.5,
            label=model["label"],
            color=palette[index % len(palette)],
            error_kw={"elinewidth": 0.8, "ecolor": COLORS["muted"]},
        )
    ax.set_xticks(positions)
    ax.set_xticklabels(metric_labels)
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("5-fold CV score")
    ax.set_title("Model comparison — cross-validation on training data", loc="left", pad=14)
    ax.legend(frameon=False, fontsize=8, ncols=3, loc="upper center", bbox_to_anchor=(0.5, -0.12))
    _style_axes(ax)
    fig.tight_layout()
    path = output_dir / "cv_model_comparison.png"
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    plot_paths["cv_comparison"] = str(path.relative_to(output_dir.parent.parent))

    # 2. Confusion matrix
    fig, ax = plt.subplots(figsize=(4.8, 4.0), dpi=180)
    matrix = np.array(metrics["confusion_matrix"]["matrix"])
    sns.heatmap(
        matrix,
        annot=True,
        fmt="d",
        cmap=sns.light_palette(COLORS["teal"], as_cmap=True),
        cbar=False,
        square=True,
        linewidths=2,
        linecolor="white",
        xticklabels=["No disease", "Disease"],
        yticklabels=["No disease", "Disease"],
        ax=ax,
        annot_kws={"fontsize": 16, "fontweight": "bold"},
    )
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title("Held-out confusion matrix", loc="left", pad=12)
    fig.tight_layout()
    path = output_dir / "confusion_matrix.png"
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    plot_paths["confusion_matrix"] = str(path.relative_to(output_dir.parent.parent))

    # 3. ROC curve
    fig, ax = plt.subplots(figsize=(5.2, 4.4), dpi=180)
    ax.plot(
        metrics["roc_curve"]["fpr"],
        metrics["roc_curve"]["tpr"],
        color=COLORS["teal"],
        linewidth=2.2,
        label=f"Selected model (AUC = {metrics['roc_curve']['auc']:.3f})",
    )
    ax.plot([0, 1], [0, 1], linestyle="--", linewidth=1, color=COLORS["muted"], label="Chance")
    ax.set_xlabel("False positive rate")
    ax.set_ylabel("True positive rate")
    ax.set_title("ROC curve — untouched test set", loc="left", pad=12)
    ax.legend(frameon=False, fontsize=8, loc="lower right")
    _style_axes(ax)
    fig.tight_layout()
    path = output_dir / "roc_curve.png"
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    plot_paths["roc_curve"] = str(path.relative_to(output_dir.parent.parent))

    # 4. Calibration
    calibration = metrics["calibration"]
    fig, ax = plt.subplots(figsize=(5.2, 4.4), dpi=180)
    ax.plot([0, 1], [0, 1], linestyle="--", linewidth=1, color=COLORS["muted"], label="Perfect calibration")
    ax.plot(
        calibration["mean_predicted"],
        calibration["fraction_positive"],
        marker="o",
        markersize=5,
        linewidth=2,
        color=COLORS["coral"],
        label=f"Model (Brier = {calibration['brier_score']:.3f})",
    )
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_xlabel("Mean predicted probability")
    ax.set_ylabel("Observed disease fraction")
    ax.set_title("Calibration — small held-out sample", loc="left", pad=12)
    ax.legend(frameon=False, fontsize=8, loc="upper left")
    _style_axes(ax)
    fig.tight_layout()
    path = output_dir / "calibration_curve.png"
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    plot_paths["calibration"] = str(path.relative_to(output_dir.parent.parent))

    # 5. Permutation importance
    importance = metrics["permutation_importance"][:10][::-1]
    fig, ax = plt.subplots(figsize=(7.0, 4.4), dpi=180)
    ax.barh(
        [item["label"] for item in importance],
        [item["mean_decrease_roc_auc"] for item in importance],
        xerr=[item["std"] for item in importance],
        color=COLORS["teal_light"],
        error_kw={"elinewidth": 0.8, "ecolor": COLORS["muted"]},
    )
    ax.axvline(0, color=COLORS["muted"], linewidth=0.8)
    ax.set_xlabel("Mean decrease in ROC-AUC when shuffled")
    ax.set_title("Held-out permutation importance", loc="left", pad=12)
    _style_axes(ax)
    ax.grid(axis="y", visible=False)
    ax.grid(axis="x", color=COLORS["grid"], linewidth=0.8)
    fig.tight_layout()
    path = output_dir / "permutation_importance.png"
    fig.savefig(path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    plot_paths["permutation_importance"] = str(
        path.relative_to(output_dir.parent.parent)
    )

    return plot_paths


def evaluate_and_save(
    pipeline,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    base_metrics: dict,
    output_dir: Path = ARTIFACTS_DIR,
) -> dict:
    """Evaluate a fitted pipeline, write metrics.json and all evaluation plots."""
    output_dir.mkdir(parents=True, exist_ok=True)
    THRESHOLD_LOCAL = THRESHOLD
    test_evaluation = compute_test_metrics(pipeline, X_test, y_test, THRESHOLD_LOCAL)
    test_evaluation["permutation_importance"] = compute_permutation_importance(
        pipeline, X_test, y_test
    )
    test_evaluation["coefficient_analysis"] = compute_coefficient_analysis(pipeline)

    comparison = base_metrics.get("model_comparison", [])
    plot_paths = save_plots(
        test_evaluation, pipeline, X_test, y_test, comparison, output_dir / "plots"
    )

    raw_df = load_raw_dataset()
    profile = build_dataset_profile(raw_df)

    metrics = dict(base_metrics)
    metrics.update(
        {
            "schema_version": "1.0.0",
            "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "threshold": THRESHOLD_LOCAL,
            "dataset": profile,
            "split": {
                "train_size": int(len(raw_df) - len(X_test)),
                "test_size": int(len(X_test)),
                "test_size_fraction": TEST_SIZE,
                "random_seed": RANDOM_SEED,
                "stratified": True,
                "test_row_indices": [int(index) for index in X_test.index],
                "test_class_counts": {
                    "no_disease": int((y_test == 0).sum()),
                    "disease": int((y_test == 1).sum()),
                },
            },
            "test_evaluation": test_evaluation,
            "plots": plot_paths,
        }
    )
    with open(output_dir / "metrics.json", "w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2, allow_nan=False)
    return metrics


def main() -> None:
    metadata = json.loads(METADATA_PATH.read_text())
    pipeline = joblib.load(PIPELINE_PATH)
    df = load_raw_dataset()
    X, y = prepare_dataset(df)
    _, X_test, _, y_test = split_dataset(X, y)
    comparison = []
    if METRICS_PATH.exists():
        previous = json.loads(METRICS_PATH.read_text())
        comparison = previous.get("model_comparison", [])
    base_metrics = {
        "model_comparison": comparison,
        "selection": json.loads(METADATA_PATH.read_text()).get("selection", {}),
    }
    metrics = evaluate_and_save(pipeline, X_test, y_test, base_metrics)
    print(
        "Evaluation complete: "
        f"{metadata['selected_model']['label']} | "
        f"accuracy={metrics['test_evaluation']['metrics']['accuracy']:.3f}, "
        f"recall={metrics['test_evaluation']['metrics']['recall']:.3f}, "
        f"f1={metrics['test_evaluation']['metrics']['f1']:.3f}, "
        f"roc_auc={metrics['test_evaluation']['metrics']['roc_auc']:.3f}"
    )


if __name__ == "__main__":
    main()
