#!/bin/bash
echo "============================================"
echo " TrueNova AI - Backend Server"
echo "============================================"
echo ""

# Train model if not already done
if [ ! -f "model/fake_news_model.pkl" ]; then
    echo "[!] Model not found. Training now..."
    echo "    This downloads ~200MB and may take 5-10 minutes."
    echo ""
    python3 train.py || { echo "[ERROR] Training failed."; exit 1; }
fi

echo "[OK] Starting server at http://localhost:8000"
echo "     Press Ctrl+C to stop."
echo ""
python3 -m uvicorn main:app --reload --port 8000
