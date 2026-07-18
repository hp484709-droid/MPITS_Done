from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import cv2
import uuid
import numpy as np

from ..database import get_db
from ..models import Camera, Match, MissingPerson
from ..services.embedding_service import get_face_locations, get_embedding
from ..services.matching_service import search_missing_persons
from ..services.alert_service import create_match_record, trigger_alert_if_eligible
from ..utils.image_utils import base64_to_cv2, save_cv2_image
from ..config import MATCH_DIR

router = APIRouter(prefix="/api", tags=["detection"])

class FrameDetectionRequest(BaseModel):
    camera_id: int
    frame: str  # Base64 data URI

@router.post("/detect")
def detect_faces_in_frame(payload: FrameDetectionRequest, db: Session = Depends(get_db)):
    # 1. Verify camera exists
    camera = db.query(Camera).filter(Camera.id == payload.camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
        
    # 2. Decode frame
    try:
        image = base64_to_cv2(payload.frame)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decode base64 frame: {e}")
        
    if image is None:
        raise HTTPException(status_code=400, detail="Decoded frame is empty.")
        
    # 3. Detect faces
    face_locations = get_face_locations(image)
    
    detections_output = []
    
    for loc in face_locations:
        top, right, bottom, left = loc
        
        # Get embedding
        embedding = get_embedding(image, loc)
        
        # Match against database
        matches = search_missing_persons(db, embedding, k=3)
        
        best_match = None
        if matches:
            best_match = matches[0] # The highest confidence match
            
        box = {
            "top": top,
            "right": right,
            "bottom": bottom,
            "left": left
        }
        
        match_info = None
        if best_match:
            person = best_match["person"]
            confidence = best_match["confidence"]
            
            match_info = {
                "person_id": person.id,
                "name": person.name,
                "confidence": confidence,
                "status": person.status
            }
            
            # If the confidence meets the threshold, save the match and trigger alerts
            # Let's save a visual copy with the bounding box drawn
            # The box color is a beautiful pastel rose: RGB(250, 139, 139) -> BGR(139, 139, 250)
            annotated = image.copy()
            cv2.rectangle(annotated, (left, top), (right, bottom), (139, 139, 250), 2)
            cv2.putText(
                annotated,
                f"{person.name} ({confidence:.0f}%)",
                (left, max(top - 10, 15)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (139, 139, 250),
                2
            )
            
            # Save annotated image
            unique_filename = f"match_{uuid.uuid4()}.jpg"
            file_path = os.path.join(MATCH_DIR, unique_filename)
            save_cv2_image(annotated, file_path)
            
            relative_match_path = f"/static/matched_frames/{unique_filename}"
            
            # Create match record (FR-4.1)
            match_record = create_match_record(
                db=db,
                person_id=person.id,
                camera_id=camera.id,
                confidence=confidence,
                matched_frame_path=relative_match_path
            )
            
            # Trigger alert and family shortlist if eligible (FR-3.4 / FR-3.6)
            triggered = trigger_alert_if_eligible(
                db=db,
                person_id=person.id,
                match_id=match_record.id,
                confidence=confidence
            )
            
            match_info["match_id"] = match_record.id
            match_info["triggered_alert"] = triggered
            match_info["matched_frame_path"] = relative_match_path
            
        detections_output.append({
            "box": box,
            "match": match_info
        })
        
    return {
        "camera_id": camera.id,
        "camera_code": camera.camera_code,
        "location_name": camera.location_name,
        "detections": detections_output
    }

@router.get("/matches")
def get_matches(status: str = "pending", db: Session = Depends(get_db)):
    """
    Fetch matches awaiting human review (or already reviewed matches).
    """
    matches = db.query(Match).filter(Match.review_status == status).order_by(Match.matched_at.desc()).all()
    
    output = []
    for m in matches:
        person = db.query(Camera).filter(Camera.id == m.camera_id).first() # wait, camera
        camera = db.query(Camera).filter(Camera.id == m.camera_id).first()
        missing_person = db.query(MissingPerson).filter(MissingPerson.id == m.missing_person_id).first()
        
        if not missing_person or not camera:
            continue
            
        output.append({
            "id": m.id,
            "confidence_score": m.confidence_score,
            "matched_frame_path": m.matched_frame_path,
            "matched_at": m.matched_at,
            "review_status": m.review_status,
            "camera": {
                "id": camera.id,
                "camera_code": camera.camera_code,
                "location_name": camera.location_name
            },
            "missing_person": {
                "id": missing_person.id,
                "name": missing_person.name,
                "age": missing_person.age,
                "gender": missing_person.gender,
                "photo_path": missing_person.photo_path
            }
        })
    return output

@router.post("/matches/{id}/review")
def review_match(id: int, review: dict, db: Session = Depends(get_db)):
    """
    Confirm or reject a suggested match. (FR-5.3)
    """
    match_record = db.query(Match).filter(Match.id == id).first()
    if not match_record:
        raise HTTPException(status_code=404, detail="Match record not found")
        
    decision = review.get("decision")
    if decision not in ["confirmed", "rejected"]:
        raise HTTPException(status_code=400, detail="Decision must be 'confirmed' or 'rejected'")
        
    match_record.review_status = decision
    match_record.reviewed_at = datetime_now()
    
    # If confirmed, trigger updating the trajectory cache
    if decision == "confirmed":
        from ..services.trajectory_service import update_trajectory_cache
        update_trajectory_cache(db, match_record.missing_person_id)
        
    db.commit()
    return {"success": True, "match_id": match_record.id, "review_status": match_record.review_status}

def datetime_now():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc)

@router.post("/sighting")
async def report_public_sighting(
    location: str = Form(...),
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
        
    # 2. Detect faces using fallback-enabled service
    face_locations = get_face_locations(image)
    if not face_locations:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No face detected in the sighting photograph. Please upload a clear photo containing a face."
        )
        
    # 3. Generate embedding for the first face
    embedding = get_embedding(image, face_locations[0])
    
    # 4. Match against MissingPerson Database
    matches = search_missing_persons(db, embedding, k=1)
    
    match_found = False
    match_details = None
    
    if matches and matches[0]["confidence"] >= 70.0:  # MATCH threshold cutoff
        best_match = matches[0]
        person = best_match["person"]
        confidence = best_match["confidence"]
        match_found = True
        
        # Get or create dummy camera for public reports
        camera = db.query(Camera).filter(Camera.camera_code == "Public-Report").first()
        if not camera:
            camera = Camera(
                camera_code="Public-Report",
                location_name="Public Sighting Report",
                latitude=22.7196,
                longitude=75.8577,
                is_active=True
            )
            db.add(camera)
            db.commit()
            db.refresh(camera)
            
        # Draw bounding box on image
        top, right, bottom, left = face_locations[0]
        annotated = image.copy()
        cv2.rectangle(annotated, (left, top), (right, bottom), (139, 139, 250), 2)
        cv2.putText(
            annotated,
            f"{person.name} ({confidence:.0f}%)",
            (left, max(top - 10, 15)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (139, 139, 250),
            2
        )
        
        # Save annotated image
        unique_filename = f"sighting_{uuid.uuid4()}.jpg"
        file_path = os.path.join(MATCH_DIR, unique_filename)
        save_cv2_image(annotated, file_path)
        
        relative_match_path = f"/static/matched_frames/{unique_filename}"
        
        # Save match
        match_record = Match(
            missing_person_id=person.id,
            camera_id=camera.id,
            confidence_score=confidence,
            matched_frame_path=relative_match_path,
            review_status="confirmed",
            reviewed_by="public_report"
        )
        db.add(match_record)
        db.commit()
        db.refresh(match_record)
        
        # Generate alert SMS/Email template
        complainant_name = person.complainant_name or "Family Member"
        complainant_contact = person.complainant_contact or "Registered Contact"
        
        simulated_msg = (
            f"ALERT: SIGHTING REPORT FOR {person.name.upper()}!\n"
            f"Dear {complainant_name},\n"
            f"Your missing person has been sighted at: {location}.\n"
            f"Match Confidence: {confidence:.0f}%\n"
            f"Time of Sighting: {datetime_now().strftime('%d-%b-%Y %I:%M %p')}\n"
            f"We have updated our command records. Please contact local authorities immediately."
        )
        
        print("\n" + "="*50)
        print(f"[ALERT] SIMULATED DISPATCH TO: {complainant_contact}")
        print(simulated_msg)
        print("="*50 + "\n")
        
        match_details = {
            "person_id": person.id,
            "name": person.name,
            "confidence": confidence,
            "photo_path": person.photo_path,
            "complainant_name": complainant_name,
            "complainant_contact": complainant_contact,
            "sighting_location": location,
            "sighting_photo": relative_match_path,
            "simulated_message": simulated_msg
        }
        
    return {
        "match_found": match_found,
        "match_details": match_details
    }
