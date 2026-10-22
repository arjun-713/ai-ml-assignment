import type { FeatureDefinition, FeatureGroup, FeatureKey } from "../types";

export const FEATURES: FeatureDefinition[] = [
  {
    key: "age",
    label: "Age",
    shortLabel: "Age",
    group: "patient",
    inputType: "number",
    unit: "years",
    required: true,
    min: 18,
    max: 100,
    step: 1,
    observedMin: 29,
    observedMax: 77,
    help: "Age at the examination.",
  },
  {
    key: "sex",
    label: "Biological sex",
    shortLabel: "Sex",
    group: "patient",
    inputType: "category",
    unit: null,
    required: true,
    options: [
      { value: 0, label: "Female" },
      { value: 1, label: "Male" },
    ],
    help: "Recorded biological sex.",
  },
  {
    key: "trestbps",
    label: "Resting blood pressure",
    shortLabel: "Resting BP",
    group: "measurements",
    inputType: "number",
    unit: "mm Hg",
    required: true,
    min: 80,
    max: 250,
    step: 1,
    observedMin: 94,
    observedMax: 200,
    help: "Systolic pressure on admission.",
  },
  {
    key: "chol",
    label: "Serum cholesterol",
    shortLabel: "Cholesterol",
    group: "measurements",
    inputType: "number",
    unit: "mg/dL",
    required: true,
    min: 100,
    max: 600,
    step: 1,
    observedMin: 126,
    observedMax: 564,
    help: "Total serum cholesterol.",
  },
  {
    key: "fbs",
    label: "Fasting blood sugar",
    shortLabel: "Fasting glucose",
    group: "measurements",
    inputType: "category",
    unit: null,
    required: true,
    options: [
      { value: 0, label: "120 mg/dL or below" },
      { value: 1, label: "Above 120 mg/dL" },
    ],
    help: "Recorded as a binary threshold.",
  },
  {
    key: "thalach",
    label: "Maximum heart rate",
    shortLabel: "Max heart rate",
    group: "measurements",
    inputType: "number",
    unit: "bpm",
    required: true,
    min: 50,
    max: 220,
    step: 1,
    observedMin: 71,
    observedMax: 202,
    help: "Peak heart rate during stress testing.",
  },
  {
    key: "cp",
    label: "Chest pain type",
    shortLabel: "Chest pain",
    group: "cardiac",
    inputType: "category",
    unit: null,
    required: true,
    options: [
      {
        value: 1,
        label: "Typical angina",
        description: "Substernal discomfort provoked by exertion and relieved by rest.",
      },
      {
        value: 2,
        label: "Atypical angina",
        description: "Chest pain with some, but not all, features of typical angina.",
      },
      {
        value: 3,
        label: "Non-anginal pain",
        description: "Pain considered unlikely to be caused by myocardial ischaemia.",
      },
      {
        value: 4,
        label: "Asymptomatic",
        description: "No chest pain reported at presentation.",
      },
    ],
    help: "Original UCI 1–4 coding.",
  },
  {
    key: "restecg",
    label: "Resting ECG",
    shortLabel: "Resting ECG",
    group: "cardiac",
    inputType: "category",
    unit: null,
    required: true,
    options: [
      {
        value: 0,
        label: "Normal",
        description: "No notable resting electrocardiographic abnormality.",
      },
      {
        value: 1,
        label: "ST-T wave abnormality",
        description: "T-wave inversion or ST elevation/depression greater than 0.05 mV.",
      },
      {
        value: 2,
        label: "Left ventricular hypertrophy",
        description: "Probable or definite LVH by Estes' criteria.",
      },
    ],
    help: "Resting ECG finding, original 0–2 coding.",
  },
  {
    key: "exang",
    label: "Exercise-induced angina",
    shortLabel: "Exercise angina",
    group: "cardiac",
    inputType: "category",
    unit: null,
    required: true,
    options: [
      { value: 0, label: "No" },
      { value: 1, label: "Yes" },
    ],
    help: "Angina provoked by exercise.",
  },
  {
    key: "oldpeak",
    label: "ST depression (oldpeak)",
    shortLabel: "ST depression",
    group: "cardiac",
    inputType: "number",
    unit: "mm",
    required: true,
    min: 0,
    max: 10,
    step: 0.1,
    observedMin: 0,
    observedMax: 6.2,
    help: "Exercise-induced ST depression.",
  },
  {
    key: "slope",
    label: "ST segment slope",
    shortLabel: "ST slope",
    group: "cardiac",
    inputType: "category",
    unit: null,
    required: true,
    options: [
      { value: 1, label: "Upsloping" },
      { value: 2, label: "Flat" },
      { value: 3, label: "Downsloping" },
    ],
    help: "ST segment at peak exercise, original 1–3 coding.",
  },
  {
    key: "ca",
    label: "Major vessels coloured",
    shortLabel: "Vessels",
    group: "cardiac",
    inputType: "category",
    unit: null,
    required: false,
    options: [
      { value: 0, label: "0 vessels", description: "No major vessel coloured by fluoroscopy." },
      { value: 1, label: "1 vessel", description: "One major vessel coloured." },
      { value: 2, label: "2 vessels", description: "Two major vessels coloured." },
      { value: 3, label: "3 vessels", description: "Three major vessels coloured." },
    ],
    help: "Vessels coloured by fluoroscopy. Optional.",
  },
  {
    key: "thal",
    label: "Thalassemia scan",
    shortLabel: "Thallium scan",
    group: "cardiac",
    inputType: "category",
    unit: null,
    required: false,
    options: [
      { value: 3, label: "Normal", description: "Normal thallium perfusion result." },
      { value: 6, label: "Fixed defect", description: "Fixed perfusion defect, suggesting scar." },
      {
        value: 7,
        label: "Reversible defect",
        description: "Reversible perfusion defect, suggesting exercise-induced ischaemia.",
      },
    ],
    help: "Thallium result, original 3/6/7 coding. Optional.",
  },
];

export const FEATURES_BY_KEY = Object.fromEntries(
  FEATURES.map((feature) => [feature.key, feature]),
) as Record<FeatureKey, FeatureDefinition>;

export const FEATURE_GROUPS: Array<{
  id: FeatureGroup;
  number: string;
  title: string;
  description: string;
}> = [
  {
    id: "patient",
    number: "01",
    title: "Patient profile",
    description: "The two demographic fields used by the Cleveland model.",
  },
  {
    id: "measurements",
    number: "02",
    title: "Health measurements",
    description: "Resting and exercise-test measurements recorded at the examination.",
  },
  {
    id: "cardiac",
    number: "03",
    title: "Cardiac examination",
    description: "Findings from the resting ECG, exercise test and cardiac imaging.",
  },
];

export const REQUIRED_FEATURES = FEATURES.filter((feature) => feature.required);

export const METRIC_LABELS = {
  accuracy: "Accuracy",
  precision: "Precision",
  recall: "Recall",
  f1: "F1 score",
  roc_auc: "ROC-AUC",
} as const;

export const FEATURE_KEYS = FEATURES.map((feature) => feature.key);
