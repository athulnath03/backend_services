from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from routes.convert import router as convert_router
from routes.status import router as status_router
from routes.download import router as download_router
from utils.cleanup import start_cleanup_scheduler

UPLOAD_DIR = "/tmp/fileconverter/uploads"
OUTPUT_DIR = "/tmp/fileconverter/outputs"

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    start_cleanup_scheduler()
    yield

app = FastAPI(title="File Converter API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(convert_router, prefix="/convert", tags=["convert"])
app.include_router(status_router, prefix="/status", tags=["status"])
app.include_router(download_router, prefix="/download", tags=["download"])

app.mount("/", StaticFiles(directory="static", html=True), name="static")
