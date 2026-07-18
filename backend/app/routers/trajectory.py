from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from ..database import get_db
from ..models import FamilyNotification, Match, MissingPerson, Camera, TrajectoryCache
from ..schemas import TrajectoryResponse, FamilyShortlistResponse, FamilyShortlistSelect
from ..services.trajectory_service import get_trajectory_for_person, update_trajectory_cache

router = APIRouter(prefix="/api", tags=["trajectory & notifications"])

@router.get("/trajectory/{person_id}", response_model=TrajectoryResponse)
def get_trajectory(person_id: int, db: Session = Depends(get_db)):
    """
    Returns the chronologically ordered trajectory points and probable search area for a missing person.
    """
    result = get_trajectory_for_person(db, person_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.get("/family/shortlist/{token}", response_model=FamilyShortlistResponse)
def get_family_shortlist(token: str, db: Session = Depends(get_db)):
    """
    Public no-login endpoint. Retrieves the shortlist of candidates sent to the family.
    """
    notification = db.query(FamilyNotification).filter(
        FamilyNotification.secure_link_token == token
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Secure link is invalid or expired.")
        
    person = db.query(MissingPerson).filter(MissingPerson.id == notification.missing_person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Missing person details not found.")
        
    match_ids = json.loads(notification.shortlist_match_ids)
    
    candidates = []
    for mid in match_ids:
        m = db.query(Match).filter(Match.id == mid).first()
        if m:
            candidates.append({
                "match_id": m.id,
                "person_id": person.id,
                "confidence": m.confidence_score,
                "photo_url": m.matched_frame_path
            })
            
    return {
        "token": token,
        "missing_person_name": person.name,
        "candidates": candidates,
        "status": notification.family_response
    }

@router.post("/family/shortlist/{token}/select")
def select_family_candidate(token: str, selection: FamilyShortlistSelect, db: Session = Depends(get_db)):
    """
    Family member selects their missing person from the shortlist, or rejects all.
    """
    notification = db.query(FamilyNotification).filter(
        FamilyNotification.secure_link_token == token
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Secure link is invalid or expired.")
        
    if notification.family_response != "pending":
        raise HTTPException(status_code=400, detail="Response has already been submitted for this shortlist.")
        
    shortlist_match_ids = json.loads(notification.shortlist_match_ids)
    selected_id = selection.selected_match_id
    
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    if selected_id is not None:
        if selected_id not in shortlist_match_ids:
            raise HTTPException(status_code=400, detail="Selected candidate is not in the shortlist.")
            
        # 1. Update notification record
        notification.family_response = "selected"
        notification.selected_match_id = selected_id
        notification.responded_at = now
        notification.location_details_sent = True
        notification.location_sent_at = now
        
        # 2. Confirm the selected match
        selected_match = db.query(Match).filter(Match.id == selected_id).first()
        if selected_match:
            selected_match.review_status = "confirmed"
            selected_match.reviewed_by = "family"
            selected_match.reviewed_at = now
            
        # 3. Reject all other matches in the shortlist
        for mid in shortlist_match_ids:
            if mid != selected_id:
                m = db.query(Match).filter(Match.id == mid).first()
                if m:
                    m.review_status = "rejected"
                    m.reviewed_by = "family"
                    m.reviewed_at = now
                    
        # 4. Trigger trajectory update
        db.commit() # save changes so cache update can load correct data
        update_trajectory_cache(db, notification.missing_person_id)
        
        # Return follow-up location info (FR-5.5)
        camera = db.query(Camera).filter(Camera.id == selected_match.camera_id).first()
        location_details = {
            "camera_location_name": camera.location_name if camera else "Unknown Junction",
            "area": camera.location_name if camera else "City Road",
            "date": selected_match.matched_at.strftime("%Y-%m-%d"),
            "time": selected_match.matched_at.strftime("%I:%M %p"),
            "note": "Probable last-known location, not a live GPS tracker of the person."
        }
        
        db.commit()
        return {
            "success": True,
            "message": "Identification confirmed. Thank you.",
            "match_found": True,
            "location_details": location_details
        }
    else:
        # None of these selected (FR-5.7)
        notification.family_response = "none"
        notification.responded_at = now
        
        # Mark all candidates in shortlist as rejected
        for mid in shortlist_match_ids:
            m = db.query(Match).filter(Match.id == mid).first()
            if m:
                m.review_status = "rejected"
                m.reviewed_by = "family"
                m.reviewed_at = now
                
        db.commit()
        return {
            "success": True,
            "message": "We have logged your response. Monitoring continues.",
            "match_found": False
        }

@router.get("/family/location/{person_id}")
def get_family_location(person_id: int, db: Session = Depends(get_db)):
    """
    Fetch the latest confirmed sighting location details for family display.
    """
    latest_confirmed_match = db.query(Match).filter(
        Match.missing_person_id == person_id,
        Match.review_status == "confirmed"
    ).order_by(Match.matched_at.desc()).first()
    
    if not latest_confirmed_match:
        raise HTTPException(status_code=404, detail="No confirmed sighting available for this case.")
        
    camera = db.query(Camera).filter(Camera.id == latest_confirmed_match.camera_id).first()
    
    return {
        "camera_location_name": camera.location_name if camera else "Unknown",
        "area": camera.location_name if camera else "City Junction",
        "date": latest_confirmed_match.matched_at.strftime("%B %d, %Y"),
        "time": latest_confirmed_match.matched_at.strftime("%I:%M %p"),
        "note": "Probable last-known location, not a live GPS tracker."
    }
