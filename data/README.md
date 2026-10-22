# Dataset provenance

## Source

**UCI Machine Learning Repository — Heart Disease** (dataset ID 45)

- Landing page: <https://archive.ics.uci.edu/dataset/45/heart+disease>
- Direct archive: <https://archive.ics.uci.edu/static/public/45/heart+disease.zip>
- Original donors: Robert Detrano, M.D., Ph.D. and colleagues at the Cleveland Clinic Foundation (with Andras Janosi, William Steinbrunn and Matthias Pfisterer).
- Original data collection: 1988.
- Downloaded: 2026-10-22 from the UCI static archive (zip 128,894 bytes).

The files in `data/raw/` are unmodified copies from the official archive:

| File | Purpose |
| --- | --- |
| `processed.cleveland.data` | The 303-row, 14-attribute Cleveland subset used for modelling. Missing values are `?`. |
| `heart-disease.names` | Original codebook and attribute documentation. |
| `Index` | Archive file listing and timestamps. |
| `cleve.mod` | Original mixed-type version of the Cleveland data, retained as provenance. |

## Verified structure

- 303 records, 76 raw attributes in the source database; the standard modelling subset has **13 predictors + `num`**.
- Predictors: `age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal`.
- Missing cells: `ca` = 4, `thal` = 2. There are no other missing values.
- Target distribution: 164 records with `num = 0`, and 139 records with `num ∈ {1,2,3,4}` (55/36/35/13).
- This project predicts **presence of angiographic coronary artery disease** (`num > 0`) from the 13 attributes. It does not predict the future probability of developing heart disease.

## Citation

Janosi, A., Steinbrunn, W., Pfisterer, M., & Detrano, R. (1988).
*Heart Disease* [Dataset]. UCI Machine Learning Repository.
<https://doi.org/10.24432/C52P4X>

The archive asks that publications using the data name the principal investigators listed in `heart-disease.names`.
