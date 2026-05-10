# Nimbus — Weather App (FastAPI)

•> https://nimbuslive.vercel.app

A weather web app built with FastAPI + vanilla HTML/CSS/JS.

## Features
- 🔍 Search weather by city
- 🌤 Live weather icons
- 📅 5-day forecast
- 💾 Download weather report as .txt

## Project Structure
```
weather_app/
├── main.py            # FastAPI backend
├── requirements.txt   # Python dependencies
└── static/
    └── index.html     # Frontend (single page)
```

## Setup & Run

1. **Install dependencies**
```bash
pip install -r requirements.txt
```

2. **Run the server**
```bash
uvicorn main:app --reload
```

3. **Open in browser**
```
http://localhost:8000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/weather?city=London` | Current weather + 5-day forecast |
| GET | `/api/download?city=London` | Download weather as .txt file |

## Notes
- The API key is pre-configured (OpenWeatherMap free tier)
- Temperature is shown in Celsius
- Forecast shows one entry per day (noon reading)
