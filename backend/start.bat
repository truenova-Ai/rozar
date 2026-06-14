@echo off
echo ============================================
echo  TrueNova AI - Backend Server
echo ============================================
echo.

:: Check if model exists
if not exist "model\fake_news_model.pkl" (
    echo [!] Model not found. Training now...
    echo     This will download ~200MB dataset and may take 5-10 minutes.
    echo.
    python train.py
    if errorlevel 1 (
        echo [ERROR] Training failed. Check your internet connection.
        pause
        exit /b 1
    )
)

echo [OK] Starting server at http://localhost:8000
echo      Press Ctrl+C to stop.
echo.
python -m uvicorn main:app --reload --port 8000
pause
