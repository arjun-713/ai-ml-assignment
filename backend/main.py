"""FastAPI application for heart-disease pattern prediction.

Run locally from the repository root:

    uvicorn backend.main:app --reload --port 8000

Interactive API docs: http://localhost:8000/docs
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from backend.predictor import HeartDiseasePredictor, PredictionError
from backend.schemas import (
    HealthResponse,
    ModelInfoResponse,
    PatientFeatures,
    PredictionResult,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("heart-api")

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.predictor = None
    app.state.startup_error = None
    try:
        app.state.predictor = HeartDiseasePredictor()
        logger.info(
            "Loaded %s (v%s) from artifacts.",
            app.state.predictor.model_label,
            app.state.predictor.model_version,
        )
    except Exception as exc:  # keep the API available for health diagnostics
        app.state.startup_error = str(exc)
        logger.exception("Model could not be loaded during startup.")
    yield


app = FastAPI(
    title="Heart Disease Detection API",
    description=(
        "Academic ML service that classifies the presence of angiographic "
        "coronary artery disease from 13 UCI Cleveland features. It is not a "
        "medical device and does not estimate future heart-disease risk."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

cors_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "").split(",")
    if origin.strip()
] or DEFAULT_CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Authorization"],
)


def _predictor_or_503(request: Request) -> HeartDiseasePredictor:
    predictor = getattr(request.app.state, "predictor", None)
    if predictor is None:
        detail = (
            "Model artifacts are unavailable. Run `python -m ml.train` and restart "
            "the API."
        )
        if getattr(request.app.state, "startup_error", None):
            logger.error("Model unavailable: %s", request.app.state.startup_error)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)
    return predictor


@app.exception_handler(RequestValidationError)
async def request_validation_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = []
    for error in exc.errors():
        location = [str(part) for part in error.get("loc", []) if part != "body"]
        errors.append(
            {
                "field": ".".join(location) or "body",
                "message": error.get("msg", "Invalid value."),
                "type": error.get("type", "value_error"),
            }
        )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Some input values are invalid. Check the highlighted fields.",
            "errors": errors,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server error on %s", request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "The server could not complete the request. Please try again."
        },
    )


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {
        "name": "Heart Disease Detection API",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get(
    "/api/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Check API and model status",
)
async def health(request: Request) -> HealthResponse:
    predictor = getattr(request.app.state, "predictor", None)
    if predictor is None:
        return HealthResponse(
            status="error",
            model_loaded=False,
            detail=getattr(request.app.state, "startup_error", None)
            or "Model not loaded.",
        )
    return HealthResponse(
        status="ok",
        model_loaded=True,
        model=predictor.model_label,
        version=predictor.model_version,
    )


@app.get(
    "/api/model-info",
    response_model=ModelInfoResponse,
    tags=["Model"],
    summary="Get reproducible model metrics, schema and dataset summary",
)
async def model_info(request: Request) -> ModelInfoResponse:
    predictor = _predictor_or_503(request)
    return ModelInfoResponse(**predictor.model_info())


@app.post(
    "/api/predict",
    response_model=PredictionResult,
    tags=["Prediction"],
    summary="Classify one de-identified patient profile",
    responses={
        422: {"description": "One or more features are missing or outside range."},
        503: {"description": "Trained model artifacts are unavailable."},
    },
)
async def predict(request: Request, patient: PatientFeatures) -> PredictionResult:
    predictor = _predictor_or_503(request)
    try:
        result = predictor.predict(patient.model_dump())
    except PredictionError as exc:
        logger.error("Prediction failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The model could not score this profile. Please try again.",
        ) from exc
    except ValidationError as exc:  # defensive: keep API responses structured
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The model response did not match the API schema.",
        ) from exc
    return PredictionResult(**result)
