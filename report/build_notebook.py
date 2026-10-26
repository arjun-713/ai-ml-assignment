#!/usr/bin/env python3
"""Build the executed academic-report notebook.

The notebook is the report source. It reads the committed training artifacts,
renders the evidence, and keeps the narrative in Markdown cells. Run this
script, then execute the notebook with nbconvert.
"""

from pathlib import Path

import nbformat as nbf

ROOT = Path(__file__).resolve().parent
TARGET = ROOT / "cardia-academic-report.ipynb"


def md(source: str) -> nbf.NotebookNode:
    return nbf.v4.new_markdown_cell(source.strip() + "\n")


def code(source: str) -> nbf.NotebookNode:
    return nbf.v4.new_code_cell(source.strip() + "\n")


cells = [
    md(
        r"""
# Heart Disease Detection Using Machine Learning

**Academic mini-project report**

**Prepared by:** Arjun  
**Course:** Artificial Intelligence and Machine Learning  
**Assessment:** Semester 5, Assignment 1  
**Report date:** 26 October 2026  
**Live application:** <https://cardia-heart-disease-alpha.vercel.app>  
**Source code:** <https://github.com/arjun-713/ai-ml-assignment>

> **Research and teaching use only.** This system is not a medical device, not a clinical risk score, and not a diagnosis. The target is disease presence at the time of examination, not the probability of developing heart disease in the future.

This notebook is a reproducible report. Every table and figure is loaded from the committed artifacts or the deployed application. The code cells are intentionally small and use helper functions so that the data path is visible without hiding the analysis behind a framework.
"""
    ),
    md(
        r"""
## Abstract

Coronary artery disease is a major cause of morbidity and mortality, and structured clinical data contain useful diagnostic signal even when advanced imaging is unavailable. This project studies supervised classification of angiographic coronary artery disease presence from the 13 original predictors of the UCI Cleveland heart-disease dataset. The work is designed around three constraints: methodological reproducibility, protection of the untouched holdout, and deployment as one self-contained web application.

Three candidate classifiers — logistic regression, random forest, and decision tree — were trained inside complete scikit-learn pipelines containing median or most-frequent imputation, standardisation, and one-hot encoding. Hyperparameters were tuned with five-fold stratified cross-validation on the 242-record training partition. The model was selected on mean cross-validated F1, with cross-validated ROC-AUC as the tie-breaker, before the 61-record holdout was opened. Logistic regression with *C* = 0.1 achieved the best cross-validated F1 (0.830 ± 0.026). On the single holdout evaluation it obtained accuracy 0.8852, disease-class precision 0.8387, recall 0.9286, F1 0.8814, ROC-AUC 0.9610, and Brier score 0.0869, with a confusion matrix of 28 true negatives, 5 false positives, 2 false negatives, and 26 true positives.

The fitted scikit-learn pipeline remains the training source of truth. Its preprocessing parameters and logistic coefficients are exported to a versioned JSON bundle, and inference is implemented in TypeScript inside Next.js route handlers. A parity test compares the TypeScript output with scikit-learn on all 303 cohort records. The resulting single application serves the assessment interface, a model-insights dashboard, an API reference, and three API routes on Vercel without a Python runtime.

**Keywords:** coronary artery disease, supervised learning, logistic regression, cross-validation, calibration, explainable machine learning, Next.js, Vercel
"""
    ),
    md(
        r"""
## Contents

1. [Setup and artifact loading](#1-setup-and-artifact-loading)
2. [Introduction](#2-introduction)
3. [Dataset and target](#3-dataset-and-target)
4. [Exploratory evidence](#4-exploratory-evidence)
5. [Methodology](#5-methodology)
6. [System design and implementation](#6-system-design-and-implementation)
7. [Results](#7-results)
8. [Discussion](#8-discussion)
9. [Limitations and future work](#9-limitations-and-future-work)
10. [Conclusion](#10-conclusion)
11. [Reproducibility checks](#11-reproducibility-checks)
12. [References and appendix](#12-references-and-appendix)
"""
    ),
    md(
        r"""
## 1. Setup and artifact loading

The notebook assumes the repository root is available either as the current directory or as its parent. It does not retrain the model; it reads the committed artifacts that were produced by the pinned Python environment. This keeps the report fast to run and makes the evidence auditable.
"""
    ),
    code(
        r"""
from pathlib import Path
import json

import pandas as pd
from IPython.display import Image, Markdown, display

pd.set_option("display.max_columns", 30)
pd.set_option("display.width", 120)
pd.set_option("display.precision", 4)

ROOT = Path.cwd()
if not (ROOT / "artifacts").is_dir():
    ROOT = ROOT.parent
assert (ROOT / "artifacts").is_dir(), f"Run from the repository or report directory: {ROOT}"


def load_json(relative_path: str) -> dict:
    # Load a UTF-8 JSON artifact relative to the repository root.
    with (ROOT / relative_path).open(encoding="utf-8") as handle:
        return json.load(handle)


def show_figure(relative_path: str, caption: str, width: int = 760) -> None:
    # Display a committed figure with a report caption.
    display(Image(filename=str(ROOT / relative_path), width=width))
    display(Markdown(f"**{caption}**"))


metrics = load_json("artifacts/metrics.json")
metadata = load_json("artifacts/model_metadata.json")
schema = load_json("artifacts/feature_schema.json")
bundle = load_json("artifacts/model_bundle.json")
parity = load_json("src/lib/model/__fixtures__/parity.json")

print(f"Repository root: {ROOT}")
print(f"Model: {bundle['model']['label']} {bundle['model']['version']}")
print(f"Decision threshold: {bundle['model']['threshold']}")
print(f"Parity records: {len(parity['rows'])}")
"""
    ),
    md(
        r"""
## 2. Introduction

### 2.1 Background and motivation

Cardiovascular disease remains one of the leading contributors to premature death and long-term disability worldwide. Coronary artery disease, the narrowing or obstruction of the coronary arteries that supply the myocardium, is frequently investigated through a combination of symptoms, electrocardiography, cardiac stress testing, and coronary angiography. The UCI Cleveland heart-disease dataset was assembled in 1988 to study the diagnostic value of non-invasive findings relative to angiographic results [1, 2]. It remains a standard teaching dataset because it combines a modest number of interpretable variables with a clinically meaningful binary target.

The dataset is attractive for an academic project, but it is also easy to misuse. A high accuracy value on a small, single-centre cohort does not establish clinical validity. The target records whether angiographic disease was present at examination, not whether a person will develop disease later. Features such as maximum heart rate and ST depression are exercise-test measurements, not general-purpose risk factors. A responsible report therefore needs to distinguish three things clearly: what the model estimates, how the estimate was validated, and what the estimate must not be used for.

### 2.2 Problem statement

Given 13 structured findings from a cardiac examination, estimate the probability that a record belongs to the disease-indicated class, where disease indication is defined as `num > 0` in the original UCI coding. The system must preserve the original feature semantics and missing-value behaviour, avoid leakage into the holdout, report threshold-dependent and ranking metrics, produce inspectable local explanations, run without a separate Python inference service, and state its limitations prominently.

### 2.3 Objectives

- Build a reproducible training and evaluation pipeline for the official UCI Cleveland file.
- Compare three classifiers under identical leakage-safe preprocessing.
- Evaluate the selected model once on an untouched holdout.
- Export the fitted inference parameters and verify TypeScript/scikit-learn parity across the cohort.
- Deliver the complete system as a single Next.js application deployed on Vercel.

### 2.4 Scope and non-goals

The system is an academic demonstration. It does not ingest electronic health records, images, laboratory time series, or free text. It does not estimate incident disease, long-term risk, treatment benefit, or prognosis. It does not claim external validity beyond the Cleveland cohort. It is not a medical device and must not be used for patient care.
"""
    ),
    md(
        r"""
## 3. Dataset and target

The official archive files are vendored under `data/raw/`. The loader verifies the 303 × 14 shape, the expected target domain, the six known missing cells, and numeric parsing before the data are used. The raw Cleveland file has SHA-256 `a74b7efa387bc9d108d7d0115d831fe9b414b29ae7124f331b622b4efa0427c8`.

The original target ranges from 0 to 4. For binary classification it is collapsed to `target = 1` when `num > 0`, yielding 164 no-disease records and 139 disease-indicated records. Retaining the original rows avoids an additional selection step on a small dataset. The only missing cells are four values of `ca` and two values of `thal`; both are handled by fitted imputers inside the pipeline.
"""
    ),
    code(
        r"""
dataset = metrics["dataset"]
split = metrics["split"]
dataset_summary = pd.DataFrame(
    [
        ("Records", dataset["n_rows"]),
        ("Predictors", dataset["n_features"]),
        ("No disease", dataset["binary_class_counts"]["no_disease"]),
        ("Disease indicated", dataset["binary_class_counts"]["disease"]),
        ("Training records", split["train_size"]),
        ("Holdout records", split["test_size"]),
        ("Holdout no disease", split["test_class_counts"]["no_disease"]),
        ("Holdout disease", split["test_class_counts"]["disease"]),
        ("Missing ca", dataset["missing_values"]["ca"]),
        ("Missing thal", dataset["missing_values"]["thal"]),
    ],
    columns=["Property", "Value"],
)
display(dataset_summary)

feature_rows = []
for feature in schema["features"]:
    if "observed_min" in feature:
        observed = f"{feature['observed_min']:g}–{feature['observed_max']:g}"
    else:
        observed = ", ".join(str(option["value"]) for option in feature.get("options", []))
    feature_rows.append(
        {
            "Feature": feature["key"],
            "Group": feature["group"],
            "Type": feature["type"],
            "Required": feature["required"],
            "Observed values": observed,
            "Unit": feature.get("unit") or "—",
        }
    )
display(pd.DataFrame(feature_rows))
"""
    ),
    md(
        r"""
## 4. Exploratory evidence

The class balance is reasonably even but not equal. Missingness is narrow: only `ca` and `thal` contain absent values. The correlation matrix is descriptive and was not used for feature selection. The selected relationships show substantial overlap between classes, which is why a multivariable model is more appropriate than a single threshold rule.
"""
    ),
    code(
        r"""
show_figure("artifacts/plots/eda_class_balance.png", "Figure 1a. Binary class distribution.", width=540)
show_figure("artifacts/plots/eda_missingness.png", "Figure 1b. Missing cells by feature.", width=540)
"""
    ),
    code(
        r"""
show_figure(
    "artifacts/plots/eda_correlation.png",
    "Figure 2. Pearson correlation matrix for the cohort. The target is the binary disease indicator.",
    width=760,
)
show_figure(
    "artifacts/plots/eda_key_relationships.png",
    "Figure 3. Selected predictor distributions by disease class.",
    width=800,
)
"""
    ),
    md(
        r"""
## 5. Methodology

### 5.1 Target definition and split

The target is binary: `target = 0` for `num = 0` and `target = 1` for `num ∈ {1, 2, 3, 4}`. A single stratified 80/20 split with `random_state = 42` produces 242 training records and 61 holdout records. The holdout is created before any model fitting and is not used for exploratory decisions, feature selection, hyperparameter tuning, threshold selection, or candidate comparison.

### 5.2 Leakage-safe preprocessing

Each candidate is a scikit-learn `Pipeline` containing a `ColumnTransformer` [3]. The numeric branch (`age`, `trestbps`, `chol`, `thalach`, `oldpeak`, `ca`) applies median imputation followed by `StandardScaler`. The categorical branch (`sex`, `cp`, `fbs`, `restecg`, `exang`, `slope`, `thal`) applies most-frequent imputation followed by one-hot encoding with unknown categories ignored. During cross-validation, each training fold fits its own preprocessing statistics; no target-derived statistic is used.

### 5.3 Tuning and selection

Hyperparameters were tuned with `GridSearchCV` and five-fold stratified cross-validation on the training partition, using ROC-AUC as the tuning score. The candidate models were then compared by mean cross-validated F1 at the 0.5 threshold, with mean cross-validated ROC-AUC as the tie-breaker. The holdout was opened only after this selection was recorded.

### 5.4 Metrics and explanations

For the disease-indicated class, precision is `TP/(TP+FP)`, recall is `TP/(TP+FN)`, and F1 is `2PR/(P+R)`. ROC-AUC measures ranking discrimination across thresholds [4]. The Brier score is the mean squared difference between the predicted probability and the binary outcome; lower is better [5]. With only 61 holdout patients, bin-level calibration estimates are unstable.

The logistic model is additive after preprocessing: `z = β₀ + Σⱼ βⱼxⱼ`. The term `βⱼxⱼ` is the contribution of a transformed feature to the log-odds. Contributions are grouped back to the original 13 inputs and the four largest absolute contributions are displayed. These are exact decompositions of the linear model, not causal effects.
"""
    ),
    code(
        r"""
validation = metadata["validation"]
selection = metrics["selection"]
selected = metadata["selected_model"]

print(f"Split: {validation['split']} (seed {validation['random_seed']})")
print(f"Cross-validation: {validation['cv_folds']} stratified folds")
print(f"Tuning score: {validation['grid_search_scoring']}")
print(f"Selection rule: {validation['selection_scoring']}")
print(f"Holdout used for selection: {validation['test_set_used_for_selection']}")
print(f"Selected model: {selected['label']}")
print(f"Hyperparameters: {selected['hyperparameters']}")
print(f"Threshold: {selected['training_threshold']}")
print(f"Selection rationale: {selection['rationale']}")
"""
    ),
    md(
        r"""
## 6. System design and implementation

The original prototype separated a React/Vite frontend from a FastAPI backend. The final system consolidates the browser application and the inference API into one Next.js App Router application:

```text
Browser
  └── Next.js App Router (React 19, TypeScript, Tailwind, Recharts)
        ├── /predict, /results, /insights, /docs
        └── /api/health, /api/model-info, /api/predict
              └── TypeScript inference
                    └── artifacts/model_bundle.json
                          └── exported from artifacts/heart_disease_pipeline.joblib
```

Python is used for training, evaluation, and artifact export only. The production deployment is one Next.js application with no separate API host and no Python runtime. The fitted scikit-learn pipeline remains the source of truth; its preprocessing parameters and logistic coefficients are exported to JSON, and the TypeScript path applies the same transformations in the same order.

A parity fixture records the scikit-learn probability and log-odds for all 303 cohort records. The Vitest suite recomputes them with the TypeScript path and requires agreement to nine decimal places. The JSON bundle and fixture are committed, so a fresh clone and a Vercel build do not need to retrain or run Python.
"""
    ),
    code(
        r"""
runtime_rows = [
    ("Python", metadata["runtime"]["python"]),
    ("scikit-learn", metadata["runtime"]["scikit_learn"]),
    ("pandas", metadata["runtime"]["pandas"]),
    ("numpy", metadata["runtime"]["numpy"]),
    ("Node.js", "22.x"),
    ("Next.js", "16.4.2"),
]
display(pd.DataFrame(runtime_rows, columns=["Component", "Version"]))

endpoints = pd.DataFrame(
    [
        ("GET", "/api/health", "Model and bundle status"),
        ("GET", "/api/model-info", "Metrics, schema, dataset summary, limitations"),
        ("POST", "/api/predict", "Validate 13 features and return a prediction"),
    ],
    columns=["Method", "Path", "Purpose"],
)
display(endpoints)
"""
    ),
    md(
        r"""
## 7. Results

The selected model is logistic regression with \(C = 0.1\), no class weighting, and a 0.5 decision threshold. The cross-validated comparison and the single holdout evaluation are shown below. The holdout is deliberately small: 61 patients, including 28 disease-indicated records. The estimates are therefore uncertain even when the point values are strong.

### 7.1 Cross-validated model comparison
"""
    ),
    code(
        r"""
comparison_rows = []
for candidate in metrics["model_comparison"]:
    cv = candidate["cv"]
    comparison_rows.append(
        {
            "Model": candidate["label"],
            "CV accuracy": cv["accuracy"]["mean"],
            "CV precision": cv["precision"]["mean"],
            "CV recall": cv["recall"]["mean"],
            "CV F1": cv["f1"]["mean"],
            "CV ROC-AUC": cv["roc_auc"]["mean"],
        }
    )

comparison = pd.DataFrame(comparison_rows).sort_values("CV F1", ascending=False).reset_index(drop=True)
comparison.index = range(1, len(comparison) + 1)
display(comparison.round(4))

best = comparison.iloc[0]
runner_up = comparison.iloc[1]
print(f"Selected: {best['Model']} (CV F1 {best['CV F1']:.4f})")
print(f"Runner-up: {runner_up['Model']} (CV F1 {runner_up['CV F1']:.4f})")
print(f"F1 margin: {best['CV F1'] - runner_up['CV F1']:.4f}")
"""
    ),
    code(
        r"""
show_figure(
    "artifacts/plots/cv_model_comparison.png",
    "Figure 4. Cross-validated comparison of the three candidate families.",
    width=760,
)
"""
    ),
    md(
        r"""
### 7.2 Holdout performance

The selected pipeline was evaluated once on the untouched 61-record holdout. The confusion matrix is TN 28, FP 5, FN 2, TP 26. The model detects 26 of 28 disease-indicated holdout patients and flags five no-disease patients. The 0.5 threshold is a default, not a clinically optimised operating point.
"""
    ),
    code(
        r"""
test_metrics = metrics["test_evaluation"]["metrics"]
calibration = metrics["test_evaluation"]["calibration"]
holdout = pd.DataFrame(
    [
        ("Accuracy", test_metrics["accuracy"]),
        ("Precision (disease class)", test_metrics["precision"]),
        ("Recall (disease class)", test_metrics["recall"]),
        ("F1 (disease class)", test_metrics["f1"]),
        ("ROC-AUC", test_metrics["roc_auc"]),
        ("Brier score", calibration["brier_score"]),
    ],
    columns=["Metric", "Value"],
)
display(holdout.round(4))

confusion = metrics["test_evaluation"]["confusion_matrix"]
confusion_table = pd.DataFrame(
    confusion["matrix"],
    index=["Actual no disease", "Actual disease"],
    columns=["Predicted no disease", "Predicted disease"],
)
display(confusion_table)
"""
    ),
    code(
        r"""
show_figure("artifacts/plots/roc_curve.png", "Figure 5a. ROC curve on the holdout (AUC 0.961).", width=540)
show_figure("artifacts/plots/confusion_matrix.png", "Figure 5b. Confusion matrix at threshold 0.5.", width=540)
"""
    ),
    code(
        r"""
show_figure(
    "artifacts/plots/calibration_curve.png",
    "Figure 6. Reliability diagram. Bin-level estimates are unstable with only 61 holdout patients.",
    width=640,
)
show_figure(
    "artifacts/plots/permutation_importance.png",
    "Figure 7. Permutation importance on the holdout. These are model associations, not causal effects.",
    width=760,
)
"""
    ),
    md(
        r"""
### 7.3 Coefficients and global importance

The coefficients below are on the transformed feature space: numeric predictors are standardised and categorical predictors are one-hot encoded. They describe the fitted model, not raw clinical effects. Permutation importance measures the decrease in holdout ROC-AUC when a feature is shuffled; negative values are possible and are not evidence that a feature is protective.
"""
    ),
    code(
        r"""
terms = pd.DataFrame(metrics["test_evaluation"]["coefficient_analysis"]["terms"])
top_terms = terms.assign(abs_coefficient=terms["coefficient"].abs()).nlargest(10, "abs_coefficient")
display(top_terms[["feature", "term_label", "coefficient", "odds_ratio"]].round(4))

importance = pd.DataFrame(metrics["test_evaluation"]["permutation_importance"])
importance = importance.sort_values("mean_decrease_roc_auc", ascending=False)
display(importance[["feature", "label", "mean_decrease_roc_auc", "std"]].round(4))
"""
    ),
    md(
        r"""
### 7.4 Application evidence

The assessment page loads complete UCI records as presets but still validates every field. The result page shows the thresholded class, the probability, the model version, the threshold, four local contributions, and the recorded inputs. The insights page is driven by the committed evaluation artifacts rather than a second, manually maintained set of numbers.
"""
    ),
    code(
        r"""
show_figure("docs/screenshots/predict.png", "Figure 8. Assessment page with a complete UCI record loaded.", width=820)
show_figure("docs/screenshots/results.png", "Figure 9. Live result page for a disease-indicated profile.", width=820)
show_figure("docs/screenshots/insights.png", "Figure 10. Model-insights overview from the committed evaluation artifacts.", width=820)
"""
    ),
    md(
        r"""
## 8. Discussion

The results support a modest but coherent conclusion: on this single Cleveland split, a regularised linear model separates disease-indicated from no-disease records well enough to be a useful teaching example. The holdout ROC-AUC of 0.961 and disease-class recall of 0.929 are strong for a 13-feature model. The cross-validated F1 of 0.830 with a fold standard deviation of 0.026 is consistent with the holdout F1 of 0.881, although the holdout estimate is necessarily more uncertain.

The comparison also illustrates why model capacity is not automatically beneficial. Both tree-based candidates can represent non-linearities, but they did not outperform the linear model under the shared preprocessing and tuning protocol. The random forest's cross-validated recall was lower and its fold variance was larger. The decision tree was the weakest and least stable. This does not prove that tree models are inappropriate for the problem; it shows that, at this sample size and with this protocol, the regularised linear model generalised best.

Logistic regression was also a defensible engineering choice. It is well regularised for a small sample, its decision function is exactly decomposable into local contributions, and its inference path can be reproduced in a few dozen lines of TypeScript. The 303-row parity test is the central correctness evidence for the serving path: it checks full-precision probabilities and log-odds on every cohort row rather than on a few examples.

The results do not support clinical deployment. The cohort is small, single-centre, and historical. The holdout has 61 patients, so a single split can move the metrics substantially. No confidence intervals, external validation, temporal validation, or prospective evaluation are reported. The probability outputs are model scores, not clinically calibrated risks. The target is angiographic disease presence at examination, not future heart-disease risk.
"""
    ),
    md(
        r"""
## 9. Limitations and future work

- **Sample size.** The cohort contains 303 records and the holdout contains 61. The resulting metric uncertainty is substantial.
- **Single-centre, historical data.** The data were collected in Cleveland in 1988. Practice patterns, population characteristics, and measurement technology have changed.
- **Target semantics.** The target is angiographic disease presence at examination, not incident disease, prognosis, or future risk.
- **Default threshold.** The 0.5 threshold was not selected for a clinical utility function. Different screening or referral contexts would require explicit cost analysis.
- **No clinical calibration.** The model's probabilities are ranking scores. No external calibration or decision-curve analysis was performed.
- **Narrow missing-data path.** Only `ca` and `thal` have missing values in training. The interface does not claim general robustness to missing inputs.
- **Descriptive explanations.** Local contributions and permutation importance describe the fitted model, not causal effects.
- **Not a medical device.** The application is not validated, regulated, or intended for patient care.

A rigorous extension would evaluate repeated stratified splits or nested cross-validation to quantify selection and split uncertainty. External validation on another Cleveland-format cohort, or on a contemporary dataset with compatible predictors, would be more informative than further tuning on the same 303 records. Calibration could be studied with isotonic or Platt scaling inside the training folds, but the small holdout would still limit confidence. Decision-curve analysis would connect the model to a specified clinical decision. A prospective study would be required before any clinical claim.
"""
    ),
    md(
        r"""
## 10. Conclusion

This project implemented an end-to-end heart-disease classification workflow with a reproducible Python training pipeline and a single Next.js deployment. It retained the original UCI Cleveland predictors, handled the six missing cells inside leakage-safe pipelines, tuned three candidate families with five-fold cross-validation, selected logistic regression on training-fold F1, and evaluated the selected model once on an untouched 61-patient holdout. The holdout ROC-AUC was 0.961 and disease-class recall was 0.929, with five false positives and two false negatives.

The deployed system demonstrates that a fitted scikit-learn pipeline can be exported into a transparent JSON representation and reproduced exactly in TypeScript. The 303-row parity test is the central correctness evidence for the serving path. The application keeps assessment data in memory, documents its API, exposes the evaluation evidence, and labels its contributions and limitations rather than presenting the output as a diagnosis.

The most important conclusion is therefore not the headline accuracy. It is the combination of a defensible validation protocol, an auditable training-to-serving boundary, and an explicit statement of what the numbers do not mean.
"""
    ),
    md(
        r"""
## 11. Reproducibility checks

The following assertions verify that the report is reading a consistent set of artifacts. They do not retrain the model; they catch stale or mismatched bundles before the evidence is interpreted.
"""
    ),
    code(
        r"""
assert metrics["dataset"]["n_rows"] == 303
assert len(parity["rows"]) == 303
assert metrics["split"]["train_size"] + metrics["split"]["test_size"] == 303
assert sum(metrics["split"]["test_class_counts"].values()) == metrics["split"]["test_size"]
assert metadata["validation"]["test_set_used_for_selection"] is False
assert bundle["model"]["version"] == metadata["model_version"]
assert bundle["model"]["key"] == metrics["selection"]["selected_model_key"]
assert metrics["test_evaluation"]["confusion_matrix"]["tp"] == 26

parity_preview = pd.DataFrame(parity["rows"])[["row_index", "probability", "log_odds"]].head(5)
display(parity_preview.round(6))
print("All artifact consistency checks passed.")
print(f"Parity fixture covers {len(parity['rows'])} rows; threshold is {parity['threshold']}.")
"""
    ),
    md(
        r"""
## 12. References and appendix

### References

[1] A. Janosi, W. Steinbrunn, M. Pfisterer, and R. Detrano. *Heart Disease* [Dataset]. UCI Machine Learning Repository, 1988. <https://doi.org/10.24432/C52P4X>

[2] R. Detrano, A. Janosi, W. Steinbrunn, M. Pfisterer, J.-P. Schmid, S. Sandhu, K. H. Guppy, S. Lee, and V. Froelicher. International application of a new probability algorithm for the diagnosis of coronary artery disease. *American Journal of Cardiology*, 64(5):304–310, 1989. <https://doi.org/10.1016/0002-9149(89)90524-9>

[3] F. Pedregosa et al. Scikit-learn: Machine learning in Python. *Journal of Machine Learning Research*, 12:2825–2830, 2011.

[4] T. Fawcett. An introduction to ROC analysis. *Pattern Recognition Letters*, 27(8):861–874, 2006.

[5] G. W. Brier. Verification of forecasts expressed in terms of probability. *Monthly Weather Review*, 78(1):1–3, 1950.

[6] T. Hastie, R. Tibshirani, and J. Friedman. *The Elements of Statistical Learning*. 2nd edition, Springer, 2009.

[7] Vercel. *Next.js Documentation: App Router, Route Handlers, and Deployment*. <https://nextjs.org/docs>, accessed October 2026.

[8] Vercel. *Vercel Documentation: Deploying Next.js Projects*. <https://vercel.com/docs>, accessed October 2026.

### Reproducibility commands

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r ml/requirements.txt
pip install -r tests/requirements.txt
python -m ml.train
python -m ml.evaluate
```

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm start
```

The deployed application is <https://cardia-heart-disease-alpha.vercel.app>. The source repository is <https://github.com/arjun-713/ai-ml-assignment>.

### Test inventory

The Python suite contains 17 tests covering dataset shape and missingness, target construction, the stratified split, preprocessing isolation, artifact consistency, recomputation of holdout metrics, exported imputer/scaler/encoder parameters, coefficient parity, and the complete 303-row probability fixture.

The TypeScript/Vitest suite contains 48 tests covering form validation, payload conversion, formatting, preset integrity, result rendering, reload semantics, preset loading, reset behaviour, server-side field errors, real route-handler inference, health and model-info responses, optional and null optional fields, unknown fields, range errors, malformed JSON, deterministic responses, no-store headers, CORS preflight, and the 303-row scikit-learn parity check.
"""
    ),
]

notebook = nbf.v4.new_notebook(cells=cells)
notebook.metadata.update(
    {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3",
        },
        "language_info": {
            "name": "python",
            "version": "3.12",
        },
        "title": "Heart Disease Detection Using Machine Learning — Academic Report",
        "authors": [{"name": "Arjun"}],
    }
)
nbf.write(notebook, TARGET)
print(f"Wrote {TARGET}")
