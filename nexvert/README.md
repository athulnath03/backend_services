# File Converter — Setup & Run Guide

## 1. Project Structure

```
fileconverter/
├── main.py
├── celery_config.py
├── pyproject.toml
├── routes/
│   ├── __init__.py
│   ├── convert.py
│   ├── status.py
│   └── download.py
├── services/
│   ├── __init__.py
│   └── converter.py
├── tasks/
│   ├── __init__.py
│   └── convert_task.py
├── utils/
│   ├── __init__.py
│   ├── validation.py
│   └── cleanup.py
└── static/
    └── index.html
```

---

## 2. System Dependencies

### Ubuntu / Debian
```bash
sudo apt update
sudo apt install -y ffmpeg poppler-utils libreoffice redis-server
sudo systemctl start redis-server
```

### macOS
```bash
brew install ffmpeg poppler redis libreoffice
brew services start redis
```

---

## 3. Python Environment (uv)

```bash
# Install uv (if not installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create env and install deps
cd fileconverter
uv venv
source .venv/bin/activate
uv pip install -e .
```

---

## 4. Run

Open 3 terminals in the `fileconverter/` directory with the venv active.

### Terminal 1 — Redis (if not running as service)
```bash
redis-server
```

### Terminal 2 — Celery Worker
```bash
celery -A celery_config.celery_app worker --loglevel=info
```

### Terminal 3 — FastAPI Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 5. Open the UI

```
http://localhost:8000
```

---

## 6. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /convert/ | Upload file + output_format, returns job_id |
| GET | /status/{job_id} | Poll job status |
| GET | /download/{job_id} | Download converted file |

### Example curl
```bash
curl -X POST http://localhost:8000/convert/ \
  -F "file=@photo.png" \
  -F "output_format=webp"
```

Response:
```json
{
  "job_id": "abc-123",
  "status": "queued",
  "input_format": "png",
  "output_format": "webp"
}
```

---

## 7. Supported Conversions

| Input | Output |
|-------|--------|
| png, jpg, jpeg, webp | ↔ png, jpg, webp |
| pdf | → png, jpg (zip of pages) |
| mp4 | → mp3, wav, gif |
| mp3, wav | → mp3, wav |
| gif | → mp4, png |
| docx, pptx, xlsx | → pdf |
