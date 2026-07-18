from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import Optional
import os
import cv2
import numpy as np
import json
import uuid

from ..database import get_db
from ..models import MissingPerson
from ..schemas import MissingPersonResponse
from ..services.embedding_service import get_face_locations, get_embedding
from ..config import UPLOAD_DIR
from ..utils.image_utils import save_cv2_image

router = APIRouter(prefix="/api", tags=["enrollment"])

@router.post("/mdb")
async def enroll_missing_person(
    name: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    last_seen_date: Optional[str] = Form(None),
    last_seen_location: Optional[str] = Form(None),
    complainant_name: Optional[str] = Form(None),
    complainant_contact: Optional[str] = Form(None),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 1. Read photo contents
    contents = await photo.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file uploaded."
        )
        
    # 2. Face Detection validation (FR-1.2)
    face_locations = get_face_locations(image)
    if not face_locations:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No face detected in the photo. Please upload a clear, front-facing photograph."
        )
        
    # 3. Generate Embedding (FR-1.3)
    # We take the first detected face for enrollment
    embedding = get_embedding(image, face_locations[0])
    
    # 4. Save photo file to disk
    file_ext = os.path.splitext(photo.filename)[1] or ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    save_cv2_image(image, file_path)
    
    # Relative path for frontend serving
    relative_photo_path = f"/static/mdb_images/{unique_filename}"
    
    # 5. Save to database
    new_person = MissingPerson(
        name=name,
        age=age,
        gender=gender,
        last_seen_date=last_seen_date,
        last_seen_location=last_seen_location,
        complainant_name=complainant_name,
        complainant_contact=complainant_contact,
        photo_path=relative_photo_path,
        embedding_vector=json.dumps(embedding),
        status="active"
    )
    
    db.add(new_person)
    db.commit()
    db.refresh(new_person)
    
    return {
        "person_id": new_person.id,
        "embedding_generated": True,
        "name": new_person.name,
        "photo_path": new_person.photo_path
    }

@router.get("/mdb", response_model=list[MissingPersonResponse])
def list_missing_persons(db: Session = Depends(get_db)):
    return db.query(MissingPerson).all()

@router.delete("/mdb/{id}")
def delete_missing_person(id: int, db: Session = Depends(get_db)):
    person = db.query(MissingPerson).filter(MissingPerson.id == id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Missing person not found")
        
    # Remove photo file if exists
    if person.photo_path:
        filename = person.photo_path.split("/")[-1]
        full_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
            except Exception as e:
                print(f"Failed to delete photo {full_path}: {e}")
                
    db.delete(person)
    db.commit()
    return {"success": True, "message": f"Successfully deleted enrollment of {person.name}"}

@router.post("/mdb/{id}/status")
def update_status(id: int, status_update: dict, db: Session = Depends(get_db)):
    person = db.query(MissingPerson).filter(MissingPerson.id == id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Missing person not found")
        
    new_status = status_update.get("status")
    if new_status not in ["active", "found"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be active or found.")
        
    person.status = new_status
    db.commit()
    return {"success": True, "status": person.status}
