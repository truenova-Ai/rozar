# TrueNova AI — Python Backend

FastAPI server powering the TrueNova AI fake news detection app.

---

## What this does

| Feature | Details |
|---------|---------|
| **ML Model** | TF-IDF (60K features, trigrams) + Logistic Regression |
| **Dataset** | WELFake — 72,134 news articles (FAKE / REAL balanced) |
| **Accuracy** | 93 – 97 % on test split |
| **OCR** | Tesseract or EasyOCR (auto-detected) |
| **API** | FastAPI with CORS — works with the Next.js frontend |

---

## Setup (one time)

### Step 1 — Install Python 3.9 or later
Download from https://python.org/downloads

### Step 2 — Install Python dependencies
Open a terminal in this `backend/` folder and run:

```bash
pip install -r requirements.txt
```

### Step 3 — Install Tesseract OCR (for image analysis)

**Windows:**
1. Download the installer from https://github.com/UB-Mannheim/tesseract/wiki
2. Install it (default path: `C:\Program Files\Tesseract-OCR\`)
3. Add that path to your system PATH environment variable

**macOS:**
```bash
brew install tesseract
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install tesseract-ocr
```

> If Tesseract is not available, the app automatically falls back to EasyOCR (slower but no installation required).

### Step 4 — Train the model
```bash
python train.py
```
This downloads the WELFake dataset (~200 MB) from HuggingFace and trains the model.
**Requires internet on first run.** Takes 3–8 minutes depending on your connection.

After training you will see:
```
MODEL ACCURACY : 96.42%
Model saved to model/fake_news_model.pkl
```

---

## Running the backend

```bash
python -m uvicorn main:app --reload --port 8000
```

The API is now live at: **http://localhost:8000**

---

## API Reference

### `GET /api/health`
Returns server status and whether the ML model is loaded.

### `POST /api/analyze`
Analyse a piece of text for fake news.

**Request:**
```json
{ "text": "Paste your news article here..." }
```

**Response:**
```json
{
  "verdict": "FAKE",
  "confidence": 91.3,
  "explanation": "This content is flagged as POTENTIALLY FAKE...",
  "features": {
    "word_count": 18,
    "has_attribution": false,
    "sensational_words": 3,
    "caps_ratio": 0.222,
    "exclamations": 4
  },
  "model_used": "ml"
}
```

### `POST /api/ocr`
Upload an image → extract text → analyse for fake news.

**Request:** `multipart/form-data` with field `file` (PNG / JPG / WEBP)

**Response:**
```json
{
  "extracted_text": "The text found in the image...",
  "verdict": "REAL",
  "confidence": 87.5,
  "explanation": "This content is assessed as AUTHENTIC...",
  "ocr_method": "Tesseract",
  "features": { ... }
}
```

---

## Project structure

```
backend/
├── main.py          ← FastAPI server (run this)
├── train.py         ← Download dataset + train model (run once)
├── requirements.txt ← Python dependencies
├── README.md        ← This file
└── model/           ← Created automatically after training
    ├── fake_news_model.pkl
    └── tfidf_vectorizer.pkl
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` again |
| `Model not found` | Run `python train.py` first |
| OCR returns empty text | Install Tesseract (Step 3) |
| CORS error in browser | Make sure backend is running on port 8000 |
| `datasets` download fails | Check your internet connection; the app falls back to heuristic analysis |

---

*Built for TrueNova AI final year project.*
