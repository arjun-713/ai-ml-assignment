import type { ModelInfo, PatientFeatures } from "@/types";

export interface ModelPreprocessing {
  numeric_features: string[];
  numeric_impute: number[];
  numeric_mean: number[];
  numeric_scale: number[];
  categorical_features: string[];
  categorical_impute: number[];
  categorical_categories: number[][];
  output_feature_names: string[];
  numeric_imputation: string;
  categorical_imputation: string;
  numeric_scaling: string;
  categorical_encoding: string;
}

export interface ModelClassifier {
  classes: number[];
  intercept: number;
  coefficients: number[];
  n_features: number;
}

export interface FeatureSchemaField {
  key: string;
  label: string;
  group: string;
  type: "number" | "category";
  unit: string | null;
  required: boolean;
  options?: Array<{ value: number; label: string; description?: string }>;
  [key: string]: unknown;
}

export interface FeatureSchema {
  schema_version: string;
  target: {
    name: string;
    model_name: string;
    labels: Record<string, string>;
    description: string;
  };
  features: FeatureSchemaField[];
  model_input_order: string[];
  preprocessing: Record<string, unknown>;
}

export interface ModelBundle {
  schema_version: string;
  exported_at_utc: string;
  model: {
    key: string;
    label: string;
    version: string;
    trained_at_utc: string;
    threshold: number;
    hyperparameters: Record<string, unknown>;
  };
  preprocessing: ModelPreprocessing;
  classifier: ModelClassifier;
  target_definition: string;
  disclaimer: string;
  feature_schema: FeatureSchema;
  model_info: ModelInfo;
}

export interface InferenceResult {
  prediction: 0 | 1;
  probability: number;
  logOdds: number;
  transformed: number[];
}

export type ModelInput = PatientFeatures;
