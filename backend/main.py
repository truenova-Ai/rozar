"""
TrueNova AI — FastAPI Backend
==============================
Endpoints:
  GET  /                   → service info
  GET  /api/health         → health + model status
  POST /api/analyze        → fake news detection (text)
  POST /api/trust-score    → detailed 5-dimension trust breakdown
  POST /api/realtime       → lightweight analysis for live typing
  POST /api/ocr            → OCR image → text → analysis

Start:
  python -m uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import io
import logging
import os
import pickle
import re
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Optional

import numpy as np
import requests as http_requests
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

# ─────────────────────────────────────────────
# App setup
# ─────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TrueNova AI — Fake News Detection",
    description="ML-powered fake news detection API with OCR and trust scoring",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Model loading
# ─────────────────────────────────────────────

MODEL_DIR       = os.path.join(os.path.dirname(__file__), "model")
MODEL_PATH      = os.path.join(MODEL_DIR, "fake_news_model.pkl")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl")

_model      = None
_vectorizer = None


def _load_model() -> bool:
    global _model, _vectorizer
    if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
        with open(VECTORIZER_PATH, "rb") as f:
            _vectorizer = pickle.load(f)
        logger.info("ML model loaded successfully.")
        return True
    logger.warning("Model files not found. Run 'python train.py' first.")
    return False


_load_model()

# ─────────────────────────────────────────────
# Text utilities
# ─────────────────────────────────────────────

# Only keep phrases that NEVER appear in real journalism
_SENSATIONAL = {
    "wake up sheeple", "they dont want you to know", "share before deleted",
    "share before they delete", "big pharma", "deep state", "globalist",
    "plandemic", "truth they hide", "what they dont want", "miracle cure",
    "doctors hate", "exposed the truth", "new world order", "illuminati",
    "government is hiding", "mainstream media wont tell you",
    "the elite dont want", "wake up people", "before it gets deleted",
    "they are hiding", "suppressed by", "banned by the government",
    "share now before", "forward this to everyone",
}

# Phrases that are strong fake-news markers only in combination
_FAKE_PHRASES = {
    "shocking truth", "you wont believe", "they admitted",
    "doctors exposed", "scientists baffled", "the cure they hide",
    "miracle remedy", "cures cancer", "destroys cancer",
    "cures diabetes naturally", "100% proven", "banned in",
}

_CREDIBLE_SOURCES = [
    # Global wire services
    "reuters", "associated press", "ap news", "afp", "bloomberg",
    # TV / broadcast
    "bbc", "cnn", "nbc", "abc news", "cbs news", "npr", "sky news",
    "al jazeera", "france 24",
    # Print / digital
    "new york times", "washington post", "guardian", "the times",
    "wall street journal", "financial times", "the economist",
    "time magazine", "newsweek", "politico", "axios",
    # India
    "times of india", "hindustan times", "ndtv", "the hindu",
    "economic times", "business standard", "mint", "india today",
    "press trust of india", "pti", "ani news",
    # Science / medical journals
    "nature", "science", "cell", "lancet", "nejm", "jama", "bmj",
    "pubmed", "plos", "scientific american",
    # Institutions / official
    "who", "cdc", "nasa", "noaa", "nih", "fda", "un", "united nations",
    "world bank", "imf", "european union", "european commission",
    "oxford university", "harvard university", "mit", "stanford",
    "reserve bank", "rbi", "sebi", "supreme court", "high court",
    "ministry of", "department of", "government of india",
    "white house", "pentagon", "10 downing", "parliament",
    "world health organization", "centers for disease control",
]


def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"http\S+|www\S+|https\S+", " ", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_features(text: str) -> dict:
    words     = text.split()
    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    lower     = text.lower()

    caps_words      = sum(1 for w in words if w.isupper() and len(w) > 2)
    sensational_cnt = sum(1 for phrase in _SENSATIONAL if phrase in lower)
    fake_phrase_cnt = sum(1 for phrase in _FAKE_PHRASES if phrase in lower)
    credible_cnt    = sum(1 for src in _CREDIBLE_SOURCES if src in lower)

    # Percentage of words that are ALL CAPS (excludes normal acronyms like WHO, NASA, UK, US)
    # Only penalise if 3+ chars and not a known acronym
    known_acronyms = {"who", "nasa", "cdc", "fbi", "cia", "nhs", "rbi", "uk", "us",
                      "un", "eu", "pm", "ceo", "cfo", "gst", "usd", "inr", "ipo"}
    true_caps = sum(1 for w in words if w.isupper() and len(w) > 2 and w.lower() not in known_acronyms)

    has_attribution = bool(re.search(
        r"\b(said|according to|reported|stated|confirmed|announced|"
        r"study shows|research shows|research found|study found|"
        r"scientists say|researchers say|officials say|data shows|"
        r"survey found|poll found|analysis shows|experts say|"
        r"told reporters|told journalists|in a statement|"
        r"in a press conference|in a filing|press release)\b",
        lower
    ))

    return {
        "word_count":          len(words),
        "sentence_count":      max(len(sentences), 1),
        "avg_sentence_length": len(words) / max(len(sentences), 1),
        "caps_ratio":          true_caps / max(len(words), 1),
        "exclamations":        text.count("!"),
        "question_marks":      text.count("?"),
        "has_attribution":     has_attribution,
        "has_quotes":          text.count('"') >= 2,
        "has_numbers":         bool(re.search(r"\d+", text)),
        "sensational_count":   sensational_cnt,
        "fake_phrase_count":   fake_phrase_cnt,
        "credible_source_cnt": credible_cnt,
        "question_count":      text.count("?"),
        "paragraph_count":     len([p for p in text.split("\n\n") if p.strip()]),
    }


def build_explanation(verdict: str, confidence: float, features: dict) -> str:
    if verdict == "REAL":
        positives = []
        if features["has_attribution"]:
            positives.append("proper source attribution")
        if features["credible_source_cnt"] > 0:
            positives.append(f"{features['credible_source_cnt']} credible source(s) referenced")
        if features["word_count"] > 120:
            positives.append("sufficient journalistic detail")
        if features["avg_sentence_length"] > 12:
            positives.append("professional sentence structure")
        if features["caps_ratio"] < 0.04:
            positives.append("measured, neutral language")
        if features["has_quotes"]:
            positives.append("direct quotations from sources")
        if features["has_numbers"]:
            positives.append("specific factual data and figures")
        if features["exclamations"] == 0:
            positives.append("no emotional punctuation")

        base = f"This content is assessed as AUTHENTIC with {confidence:.0f}% confidence. "
        if positives:
            base += f"Credibility signals detected: {', '.join(positives)}. "
        base += (
            "The writing style, structure, and language patterns align with credible journalism. "
            "Always verify with the original source before sharing."
        )
    else:
        red_flags = []
        if features["caps_ratio"] > 0.08:
            red_flags.append(
                f"excessive CAPS usage ({features['caps_ratio']:.0%} of words)"
            )
        if features["exclamations"] > 1:
            red_flags.append(
                f"{features['exclamations']} exclamation mark(s) — emotional manipulation"
            )
        if features["sensational_count"] > 0:
            red_flags.append(
                f"{features['sensational_count']} conspiracy / sensationalist phrase(s)"
            )
        if features.get("fake_phrase_count", 0) > 0:
            red_flags.append(
                f"{features['fake_phrase_count']} misinformation phrase(s) detected"
            )
        if not features["has_attribution"]:
            red_flags.append("no named source or institution cited")
        if features["word_count"] < 40:
            red_flags.append("unusually short for credible news")
        if not features["has_numbers"]:
            red_flags.append("no statistics or specific figures")

        base = f"This content is flagged as POTENTIALLY FAKE with {confidence:.0f}% confidence. "
        if red_flags:
            base += f"Red flags found: {'; '.join(red_flags)}. "
        base += (
            "Cross-reference with BBC, Reuters, AP News, or use Snopes / PolitiFact "
            "to verify before sharing."
        )

    return base


# ─────────────────────────────────────────────
# Heuristic fallback
# ─────────────────────────────────────────────

def heuristic_predict(features: dict) -> tuple[str, float]:
    score = 50.0

    wc = features["word_count"]
    if wc > 200:   score += 18
    elif wc > 100: score += 12
    elif wc > 50:  score += 6
    elif wc < 20:  score -= 20

    if features["has_attribution"]:                    score += 18
    if features["has_quotes"]:                         score += 10
    if features["has_numbers"]:                        score += 8
    if features["avg_sentence_length"] > 15:           score += 8
    elif features["avg_sentence_length"] > 10:         score += 4
    if features["credible_source_cnt"] > 0:            score += features["credible_source_cnt"] * 8
    if features["caps_ratio"] < 0.02:                  score += 6
    if features["exclamations"] == 0:                  score += 5

    score -= features["sensational_count"] * 12
    score -= features.get("fake_phrase_count", 0) * 14
    if features["exclamations"] > 3:    score -= 14
    elif features["exclamations"] > 1:  score -= 6
    if features["caps_ratio"] > 0.15:   score -= 18
    elif features["caps_ratio"] > 0.08: score -= 9

    verdict    = "REAL" if score >= 50 else "FAKE"
    confidence = min(96.0, max(52.0, abs(score - 50) * 1.6 + 55))
    return verdict, confidence


# ─────────────────────────────────────────────
# OCR helpers
# ─────────────────────────────────────────────

def ocr_tesseract(image: Image.Image) -> str:
    import pytesseract
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    return pytesseract.image_to_string(image, config=r"--oem 3 --psm 6").strip()


def ocr_easyocr(image: Image.Image) -> str:
    import easyocr
    reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    results = reader.readtext(np.array(image))
    return " ".join(item[1] for item in results).strip()


def extract_text_from_image(image: Image.Image) -> tuple[str, str]:
    for func, name in ((ocr_tesseract, "Tesseract"), (ocr_easyocr, "EasyOCR")):
        try:
            text = func(image)
            if text:
                logger.info(f"{name} extracted {len(text)} characters.")
                return text, name
        except ImportError:
            logger.warning(f"{name} not installed.")
        except Exception as exc:
            logger.warning(f"{name} failed: {exc}")
    return "", "none"


# ─────────────────────────────────────────────
# Core prediction
# ─────────────────────────────────────────────

def _credibility_score(features: dict) -> int:
    """Score how credible text looks (higher = more likely REAL)."""
    score = 0
    if features["has_attribution"]:              score += 5
    if features["credible_source_cnt"] > 0:      score += features["credible_source_cnt"] * 4
    if features["has_quotes"]:                   score += 3
    if features["has_numbers"]:                  score += 3
    if features["avg_sentence_length"] > 14:     score += 3
    elif features["avg_sentence_length"] > 10:   score += 1
    if features["caps_ratio"] < 0.02:            score += 3
    elif features["caps_ratio"] < 0.05:          score += 1
    if features["exclamations"] == 0:            score += 3
    elif features["exclamations"] <= 1:          score += 1
    if features["sensational_count"] == 0:       score += 4
    if features["fake_phrase_count"] == 0:       score += 2
    if features["word_count"] > 80:              score += 2
    elif features["word_count"] > 40:            score += 1
    return score


def _fake_score(features: dict) -> int:
    """Score how fake text looks (higher = more likely FAKE)."""
    score = 0
    score += features["sensational_count"] * 5
    score += features["fake_phrase_count"] * 6
    score += features["exclamations"] * 3
    if features["caps_ratio"] > 0.20:   score += 10
    elif features["caps_ratio"] > 0.12: score += 6
    elif features["caps_ratio"] > 0.07: score += 3
    if not features["has_attribution"]: score += 3
    if not features["has_numbers"]:     score += 2
    if features["word_count"] < 20:     score += 3
    return score


def predict(text: str) -> dict:
    features = extract_features(text)
    cred  = _credibility_score(features)
    fake  = _fake_score(features)

    if _model is not None and _vectorizer is not None:
        cleaned = clean_text(text)
        X       = _vectorizer.transform([cleaned])
        pred    = _model.predict(X)[0]
        proba   = _model.predict_proba(X)[0]

        ml_verdict    = "REAL" if pred == 1 else "FAKE"
        ml_confidence = float(max(proba)) * 100

        verdict    = ml_verdict
        confidence = ml_confidence

        # ── Credibility override ─────────────────────────────────────────
        # If ML says FAKE but text has strong credibility signals → override
        if verdict == "FAKE" and cred >= 12 and fake <= 3:
            verdict    = "REAL"
            confidence = max(ml_confidence, 78.0)
        elif verdict == "FAKE" and cred >= 8 and fake <= 5 and ml_confidence < 75:
            verdict    = "REAL"
            confidence = max(ml_confidence, 68.0)

        # If ML says REAL but text has strong fake signals → override
        if verdict == "REAL" and fake >= 15 and cred <= 4:
            verdict    = "FAKE"
            confidence = max(ml_confidence, 78.0)
        elif verdict == "REAL" and fake >= 10 and cred <= 6 and ml_confidence < 75:
            verdict    = "FAKE"
            confidence = max(ml_confidence, 68.0)

        # ── Confidence adjustments (post-override) ───────────────────────
        if verdict == "REAL":
            if features["credible_source_cnt"] > 0:
                confidence = min(confidence + features["credible_source_cnt"] * 5, 99)
            if features["has_attribution"]:    confidence = min(confidence + 4, 99)
            if features["has_quotes"]:         confidence = min(confidence + 3, 99)
            if features["has_numbers"]:        confidence = min(confidence + 2, 99)
            if features["exclamations"] == 0 and features["caps_ratio"] < 0.03:
                confidence = min(confidence + 3, 99)

        if verdict == "FAKE":
            if features["sensational_count"] > 2: confidence = min(confidence + 6, 99)
            if features["fake_phrase_count"] > 0:  confidence = min(confidence + 5, 99)
            if features["caps_ratio"] > 0.15:      confidence = min(confidence + 4, 99)
            if features["exclamations"] > 3:       confidence = min(confidence + 4, 99)

        confidence = round(min(99.0, max(52.0, confidence)), 1)

    else:
        verdict, confidence = heuristic_predict(features)

    explanation = build_explanation(verdict, confidence, features)

    return {
        "verdict":     verdict,
        "confidence":  confidence,
        "explanation": explanation,
        "features": {
            "word_count":          features["word_count"],
            "has_attribution":     features["has_attribution"],
            "sensational_words":   features["sensational_count"] + features["fake_phrase_count"],
            "caps_ratio":          round(features["caps_ratio"], 3),
            "exclamations":        features["exclamations"],
            "avg_sentence_length": round(features["avg_sentence_length"], 1),
            "credible_sources":    features["credible_source_cnt"],
        },
        "model_used": "ml" if _model is not None else "heuristic",
    }


# ─────────────────────────────────────────────
# Trust score calculation
# ─────────────────────────────────────────────

def compute_trust_score(text: str) -> dict:
    features = extract_features(text)

    # 1. Source Attribution (0–100, weight 30%)
    source = 15
    if features["has_attribution"]:   source += 55
    if features["has_quotes"]:        source += 20
    if features["credible_source_cnt"] > 0:
        source = min(100, source + features["credible_source_cnt"] * 10)
    source = min(100, source)

    # 2. Emotional Language (0–100, higher = calmer = better, weight 20%)
    emotion = 100
    emotion -= min(50, features["exclamations"] * 10)
    emotion -= min(35, int(features["caps_ratio"] * 250))
    if features["question_count"] > 3:
        emotion -= 10
    emotion = max(0, emotion)

    # 3. Factual Density (0–100, weight 25%)
    factual = 25
    if features["has_numbers"]:        factual += 25
    if features["word_count"] > 200:   factual += 25
    elif features["word_count"] > 100: factual += 15
    elif features["word_count"] > 50:  factual += 8
    if features["avg_sentence_length"] > 15: factual += 15
    elif features["avg_sentence_length"] > 10: factual += 8
    if features["paragraph_count"] > 2: factual += 10
    factual = min(100, factual)

    # 4. Sensationalism (0–100, higher = less sensational = better, weight 15%)
    sensational = 100 - min(100, features["sensational_count"] * 18)
    if features["exclamations"] > 4: sensational = max(0, sensational - 20)
    sensational = max(0, sensational)

    # 5. Writing Quality (0–100, weight 10%)
    writing = 40
    asl = features["avg_sentence_length"]
    if asl > 18: writing += 20
    elif asl > 12: writing += 12
    if features["word_count"] > 100: writing += 15
    if features["caps_ratio"] < 0.03: writing += 15
    if features["sentence_count"] > 3: writing += 10
    writing = min(100, writing)

    # Weighted overall
    overall = round(
        source      * 0.30 +
        emotion     * 0.20 +
        factual     * 0.25 +
        sensational * 0.15 +
        writing     * 0.10
    )

    # ML verdict
    ml = predict(text)

    def label(score: int, hi: int = 70, lo: int = 40) -> str:
        if score >= hi: return "Strong"
        if score >= lo: return "Moderate"
        return "Weak"

    return {
        "overall_score": overall,
        "verdict":       ml["verdict"],
        "confidence":    ml["confidence"],
        "explanation":   ml["explanation"],
        "model_used":    ml["model_used"],
        "breakdown": {
            "source_attribution": {
                "score":  source,
                "label":  label(source),
                "weight": "30%",
                "detail": (
                    "Contains source attribution and credible references."
                    if features["has_attribution"]
                    else "No source attribution or credible references found."
                ),
            },
            "emotional_language": {
                "score":  emotion,
                "label":  ("Calm" if emotion >= 70 else "Moderate" if emotion >= 40 else "High Emotion"),
                "weight": "20%",
                "detail": (
                    f"{features['exclamations']} exclamation mark(s), "
                    f"{features['caps_ratio']:.0%} of words in CAPS."
                ),
            },
            "factual_density": {
                "score":  factual,
                "label":  label(factual),
                "weight": "25%",
                "detail": (
                    f"{features['word_count']} words across "
                    f"{features['sentence_count']} sentence(s). "
                    + ("Contains numerical data." if features["has_numbers"] else "No numbers or statistics.")
                ),
            },
            "sensationalism": {
                "score":  sensational,
                "label":  ("Minimal" if sensational >= 70 else "Moderate" if sensational >= 40 else "High"),
                "weight": "15%",
                "detail": (
                    f"{features['sensational_count']} sensationalist / clickbait term(s) detected."
                    if features["sensational_count"] > 0
                    else "No sensationalist language detected."
                ),
            },
            "writing_quality": {
                "score":  writing,
                "label":  ("Professional" if writing >= 70 else "Moderate" if writing >= 40 else "Poor"),
                "weight": "10%",
                "detail": (
                    f"Average sentence length: {features['avg_sentence_length']:.1f} words."
                ),
            },
        },
        "raw_features": {k: v for k, v in features.items()},
    }


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class TextRequest(BaseModel):
    text: str


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "service":      "TrueNova AI — Fake News Detection API",
        "version":      "2.0.0",
        "model_loaded": _model is not None,
        "endpoints": {
            "analyze":     "POST /api/analyze",
            "trust_score": "POST /api/trust-score",
            "realtime":    "POST /api/realtime",
            "ocr":         "POST /api/ocr",
            "health":      "GET  /api/health",
        },
    }


@app.get("/api/health")
def health():
    return {
        "status":       "ok",
        "model_loaded": _model is not None,
        "mode":         "ml" if _model is not None else "heuristic (run train.py to enable ML)",
    }


@app.post("/api/analyze")
def analyze_text(request: TextRequest):
    """Full fake news detection with explanation and feature signals."""
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if len(text) < 10:
        raise HTTPException(status_code=400, detail="Text is too short for meaningful analysis.")
    return predict(text)


@app.post("/api/trust-score")
def trust_score(request: TextRequest):
    """
    Detailed 5-dimension trust breakdown:
      • Source Attribution (30%)
      • Emotional Language  (20%)
      • Factual Density     (25%)
      • Sensationalism      (15%)
      • Writing Quality     (10%)

    Returns overall trust score (0–100) + per-dimension scores.
    """
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    if len(text) < 10:
        raise HTTPException(status_code=400, detail="Text is too short for analysis.")
    return compute_trust_score(text)


@app.post("/api/realtime")
def realtime_analysis(request: TextRequest):
    """
    Lightweight live analysis — called on every keystroke (debounced).
    Returns key metrics without full explanation to stay fast.
    """
    text = request.text.strip()
    if not text or len(text) < 5:
        return {
            "verdict":          None,
            "confidence":       0,
            "word_count":       0,
            "caps_ratio":       0,
            "sensational_count": 0,
            "exclamations":     0,
            "has_attribution":  False,
            "has_numbers":      False,
        }

    features = extract_features(text)

    # Quick ML or heuristic prediction
    if _model is not None and _vectorizer is not None and len(text) >= 20:
        cleaned = clean_text(text)
        X       = _vectorizer.transform([cleaned])
        pred    = _model.predict(X)[0]
        proba   = _model.predict_proba(X)[0]
        verdict    = "REAL" if pred == 1 else "FAKE"
        confidence = round(float(max(proba)) * 100, 1)
    elif len(text) >= 20:
        verdict, confidence = heuristic_predict(features)
        confidence = round(confidence, 1)
    else:
        verdict    = None
        confidence = 0

    return {
        "verdict":           verdict,
        "confidence":        confidence,
        "word_count":        features["word_count"],
        "caps_ratio":        round(features["caps_ratio"] * 100, 1),
        "sensational_count": features["sensational_count"],
        "exclamations":      features["exclamations"],
        "has_attribution":   features["has_attribution"],
        "has_numbers":       features["has_numbers"],
        "avg_sentence_length": round(features["avg_sentence_length"], 1),
        "credible_sources":  features["credible_source_cnt"],
    }


@app.post("/api/ocr")
async def analyze_image(file: UploadFile = File(...)):
    """Extract text from an image (OCR) then run fake news analysis."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    raw = await file.read()
    try:
        image = Image.open(io.BytesIO(raw))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not open image — file may be corrupted.")

    extracted_text, ocr_method = extract_text_from_image(image)

    if not extracted_text:
        return {
            "extracted_text": "",
            "verdict":        "UNKNOWN",
            "confidence":     0,
            "explanation":    (
                "No readable text was found in this image. "
                "Ensure the image contains clear, legible text and that "
                "Tesseract OCR is installed (see README.md)."
            ),
            "ocr_method":     ocr_method,
            "features":       {},
        }

    result               = predict(extracted_text)
    result["extracted_text"] = extracted_text
    result["ocr_method"]     = ocr_method
    return result


# ─────────────────────────────────────────────
# Related results — Google News RSS + search links
# ─────────────────────────────────────────────

_STOPWORDS = {
    "the","a","an","is","are","was","were","be","been","have","has","had",
    "do","does","did","will","would","could","should","may","might","must",
    "this","that","these","those","and","or","but","in","on","at","to",
    "for","of","with","by","from","as","it","its","not","also","just",
    "very","so","if","then","than","more","most","some","any","all","been",
    "about","after","before","when","where","who","which","what","how",
}


def _build_query(text: str) -> str:
    """Extract 5–6 meaningful keywords from text as a search query."""
    words = re.findall(r"[A-Za-z]{4,}", text)
    seen, meaningful = set(), []
    for w in words:
        lw = w.lower()
        if lw not in _STOPWORDS and lw not in seen:
            seen.add(lw)
            meaningful.append(w)
        if len(meaningful) >= 6:
            break
    return " ".join(meaningful) if meaningful else text[:60]


@app.post("/api/related-results")
def related_results(request: TextRequest):
    """
    Fetch related news articles via Google News RSS and return:
    • web_results   — up to 6 real news articles (title, source, date, url)
    • search_links  — direct links to Google Fact Check, Snopes, PolitiFact,
                      Twitter/X, Reuters, BBC, FactCheck.org, Google News
    • query         — the keyword query used for searching
    """
    text = request.text.strip()
    if not text:
        return {"query": "", "web_results": [], "search_links": {}}

    query = _build_query(text)
    enc   = urllib.parse.quote(query)

    # ── Google News RSS ──────────────────────────────────────────
    articles: list[dict] = []
    try:
        rss_url = f"https://news.google.com/rss/search?q={enc}&hl=en-US&gl=US&ceid=US:en"
        resp = http_requests.get(
            rss_url,
            timeout=7,
            headers={"User-Agent": "Mozilla/5.0 (compatible; TrueNovaBot/1.0)"},
        )
        if resp.ok:
            root = ET.fromstring(resp.content)
            for item in root.findall(".//item")[:6]:
                title    = item.findtext("title",   "").strip()
                link     = item.findtext("link",    "").strip()
                pub_date = item.findtext("pubDate", "").strip()
                src_elem = item.find("source")
                source   = src_elem.text.strip() if src_elem is not None else "News"
                if title and link:
                    # Strip "- Source Name" suffix Google appends
                    clean_title = re.sub(r"\s*[-–]\s*[^-–]+$", "", title).strip() or title
                    articles.append({
                        "title":  clean_title,
                        "url":    link,
                        "source": source,
                        "date":   pub_date[:16] if pub_date else "",
                    })
    except Exception as exc:
        logger.warning(f"Google News RSS failed: {exc}")

    search_links = {
        "google_fact_check": f"https://toolbox.google.com/factcheck/explorer/search/{enc}",
        "google_news":       f"https://news.google.com/search?q={enc}",
        "twitter":           f"https://twitter.com/search?q={enc}&src=typed_query&f=live",
        "snopes":            f"https://www.snopes.com/?s={enc}",
        "politifact":        f"https://www.politifact.com/search/?q={enc}",
        "factcheck_org":     f"https://www.factcheck.org/?s={enc}",
        "reuters":           f"https://www.reuters.com/search/news?blob={enc}",
        "bbc":               f"https://www.bbc.co.uk/search?q={enc}",
    }

    return {
        "query":        query,
        "web_results":  articles,
        "search_links": search_links,
    }
