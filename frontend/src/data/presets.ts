import type { FormValues } from "../types";

export interface SamplePreset {
  id: string;
  name: string;
  summary: string;
  context: string;
  values: FormValues;
}

/**
 * Three complete, de-identified records copied from the official UCI Cleveland
 * file (zero-based row indices 4, 1 and 6). Categorical values keep the original
 * UCI encodings. Source labels are intentionally omitted from the interface so
 * that the demonstration is not primed by the known outcome.
 */
export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: "atypical-screening",
    name: "Atypical chest pain",
    summary: "41-year-old female · resting ECG: LVH",
    context: "Cohort record 005 · complete record",
    values: {
      age: "41",
      sex: "0",
      cp: "2",
      trestbps: "130",
      chol: "204",
      fbs: "0",
      restecg: "2",
      thalach: "172",
      exang: "0",
      oldpeak: "1.4",
      slope: "1",
      ca: "0",
      thal: "3",
    },
  },
  {
    id: "exercise-limited",
    name: "Exercise-limited",
    summary: "67-year-old male · exertional angina · max HR 108",
    context: "Cohort record 002 · complete record",
    values: {
      age: "67",
      sex: "1",
      cp: "4",
      trestbps: "160",
      chol: "286",
      fbs: "0",
      restecg: "2",
      thalach: "108",
      exang: "1",
      oldpeak: "1.5",
      slope: "2",
      ca: "3",
      thal: "3",
    },
  },
  {
    id: "asymptomatic-female",
    name: "Asymptomatic profile",
    summary: "62-year-old female · ST depression 3.6 mm · 2 vessels",
    context: "Cohort record 007 · complete record",
    values: {
      age: "62",
      sex: "0",
      cp: "4",
      trestbps: "140",
      chol: "268",
      fbs: "0",
      restecg: "2",
      thalach: "160",
      exang: "0",
      oldpeak: "3.6",
      slope: "3",
      ca: "2",
      thal: "3",
    },
  },
];
