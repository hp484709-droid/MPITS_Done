from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from .database import init_db, SessionLocal
from .config import UPLOAD_DIR, MATCH_DIR
from .models import User, Camera
from .routers import auth, enrollment, detection, trajectory
from .routers.auth import get_password_hash

# Preseed mock data if empty
def preseed_db():
    db = SessionLocal()
    try:
        # 1. Seed admin user
        admin_exists = db.query(User).filter(User.username == "admin").first()
        if not admin_exists:
            hashed_pwd = get_password_hash("admin123")
            admin_user = User(
                username="admin",
                password_hash=hashed_pwd,
                role="admin",
                email="admin@mpits.gov.in",
                phone="+919876543210"
            )
            db.add(admin_user)
            print("[SEED] Created admin user: username=admin, password=admin123")
            
        # 2. Seed mock CCTV cameras
        camera_count = db.query(Camera).count()
        if camera_count == 0:
            mock_cameras = [
                Camera(camera_code="Indore-MG-Road-Cam01", location_name="MG Road Junction", latitude=22.7196, longitude=75.8577, is_active=True),
                Camera(camera_code="Indore-Palasia-Cam02", location_name="Palasia Square", latitude=22.7244, longitude=75.8839, is_active=True),
                Camera(camera_code="Indore-Rajwada-Cam03", location_name="Rajwada Palace Crossing", latitude=22.7177, longitude=75.8539, is_active=True),
                Camera(camera_code="Indore-Vijay-Nagar-Cam04", location_name="Vijay Nagar Square", latitude=22.7533, longitude=75.8937, is_active=True),
                Camera(camera_code="Indore-Bhanwarkuan-Cam05", location_name="Bhanwarkuan Tower Crossing", latitude=22.6997, longitude=75.8679, is_active=True)
            ]
            db.add_all(mock_cameras)
            print("[SEED] Created 5 mock cameras in Indore city.")
            
        db.commit()
    except Exception as e:
        print(f"[SEED] Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    preseed_db()
    yield
    # Shutdown

app = FastAPI(
    title="Missing Person Identification & Trajectory Tracking API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files to serve enrolled images and match logs
app.mount("/static/mdb_images", StaticFiles(directory=UPLOAD_DIR), name="mdb_images")
app.mount("/static/matched_frames", StaticFiles(directory=MATCH_DIR), name="matched_frames")

# Register routers
app.include_router(auth.router)
app.include_router(enrollment.router)
app.include_router(detection.router)
app.include_router(trajectory.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "Missing Person Identification & Trajectory Tracking System (MPITS)",
        "docs_url": "/docs"
    }
