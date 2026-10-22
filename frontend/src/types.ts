export type FeatureKey =
  | "age"
  | "sex"
  | "cp"
  | "trestbps"
  | "chol"
  | "fbs"
  | "restecg"
  | "thalach"
  | "exang"
  | "oldpeak"
  | "slope"
  | "ca"
  | "thal";

export type FeatureGroup = "patient" | "measurements" | "cardiac";

export interface FeatureOption {
  value: number;
  label: string;
  description?: string;
}

export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  shortLabel: string;
  group: FeatureGroup;
  inputType: "number" | "category";
  unit: string | null;
  required: boolean;
  min?: number;
  max?: number;
  step?: number;
  observedMin?: number;
  observedMax?: number;
  options?: FeatureOption[];
  help: string;
}

export type FormValues = Record<FeatureKey, string>;
export type FieldErrors = Partial<Record<FeatureKey, string>>;

export interface PatientFeatures {
  age: number;
  sex: number;
  cp: number;
  trestbps: number;
  chol: number;
  fbs: number;
  restecg: number;
  thalach: number;
  exang: number;
  oldpeak: number;
  slope: number;
  ca: number | null;
  thal: number | null;
}

export interface Contribution {
  feature: string;
  label: string;
  value: string;
  log_odds_contribution: number;
  direction: "toward_disease" | "toward_no_disease";
  relative_strength: number;
}

export interface PredictionResult {
  prediction: 0 | 1;
  classification: string;
  probability: number;
  probability_note: string;
  threshold: number;
  model: {
    key: string;
    label: string;
    version: string;
    threshold: number;
  };
  contributions: Contribution[];
  explanation: string;
  disclaimer: string;
  target_definition: string;
}

export interface AssessmentRecord {
  input: PatientFeatures;
  result: PredictionResult;
  submittedAt: string;
}

export type MetricKey = "accuracy" | "precision" | "recall" | "f1" | "roc_auc";

export interface CVScore {
  mean: number;
  std: number;
  folds: number[];
}

export interface ModelComparison {
  key: string;
  label: string;
  description: string;
  cv: Record<MetricKey, CVScore>;
  best_params: Record<string, unknown>;
  tuning: {
    scoring: string;
    candidates_evaluated: number;
    best_grid_cv_roc_auc: number;
    folds: number;
  };
  fit_seconds: number;
  rank: number;
}

export interface ClassificationReportRow {
  precision: number;
  recall: number;
  "f1-score": number;
  support: number;
}

export interface CategoricalAssociation {
  feature: string;
  label: string;
  groups: Array<{ label: string; n: number; disease_rate: number | null }>;
}

export interface ModelInfo {
  model: {
    key: string;
    label: string;
    version: string;
    trained_at_utc: string;
    threshold: number;
    hyperparameters: Record<string, unknown>;
  };
  selection: {
    selected_model_key: string;
    selected_model_name: string;
    primary_metric: string;
    primary_metric_label: string;
    tie_breaker: string;
    selected_cv_scores: Record<MetricKey, CVScore>;
    runner_up: string;
    rationale: string;
    selection_protocol: string;
    rankings: Array<{
      rank: number;
      model: string;
      cv_f1: number;
      cv_recall: number;
      cv_roc_auc: number;
    }>;
  };
  validation: {
    split: string;
    random_seed: number;
    test_size: number;
    cv_folds: number;
    cv_shuffle: boolean;
    grid_search_scoring: string;
    selection_scoring: string;
    test_set_used_for_selection: boolean;
  };
  test_metrics: Record<MetricKey, number>;
  comparison: ModelComparison[];
  confusion_matrix: {
    labels: string[];
    matrix: number[][];
    tn: number;
    fp: number;
    fn: number;
    tp: number;
  };
  roc_curve: { fpr: number[]; tpr: number[]; auc: number };
  calibration: {
    mean_predicted: number[];
    fraction_positive: number[];
    brier_score: number;
    n_bins: number;
    note: string;
  };
  classification_report: {
    no_disease: ClassificationReportRow;
    disease: ClassificationReportRow;
    macro_avg: ClassificationReportRow;
    weighted_avg: ClassificationReportRow;
  };
  permutation_importance: Array<{
    feature: string;
    label: string;
    mean_decrease_roc_auc: number;
    std: number;
  }>;
  coefficient_analysis: {
    available: boolean;
    reason?: string;
    intercept?: number;
    terms?: Array<{
      term: string;
      feature: string;
      term_label: string;
      coefficient: number;
      odds_ratio: number;
    }>;
    note?: string;
  };
  dataset: {
    n_rows: number;
    n_features: number;
    target_distribution_original: Record<string, number>;
    binary_class_counts: { no_disease: number; disease: number };
    missing_values: Record<string, number>;
    feature_ranges: Record<string, { min: number; max: number }>;
    correlation: {
      features: string[];
      labels: string[];
      matrix: number[][];
    };
    categorical_associations: CategoricalAssociation[];
    numeric_by_class: Array<{
      feature: string;
      label: string;
      unit: string | null;
      no_disease_mean: number;
      disease_mean: number;
      overall_median: number;
      overall_min: number;
      overall_max: number;
    }>;
  };
  features: Array<{
    key: string;
    label: string;
    group: string;
    type: string;
    unit: string | null;
    min?: number;
    max?: number;
    required: boolean;
    options?: Array<{ value: number; label: string }>;
    description: string;
  }>;
  preprocessing: Record<string, unknown>;
  dataset_info: {
    name: string;
    source_url: string;
    raw_file: string;
    sha256: string;
    n_rows: number;
    n_predictors: number;
    missing_cells: Record<string, number>;
    class_counts: { no_disease: number; disease: number };
    positive_class_definition: string;
  };
  limitations: string[];
  intended_use: string;
  target_definition: string;
  disclaimer: string;
}

export interface HealthStatus {
  status: "ok" | "starting" | "error";
  model_loaded: boolean;
  model: string | null;
  version: string | null;
  detail: string | null;
}

export interface ApiFieldError {
  field: string;
  message: string;
  type: string;
}
