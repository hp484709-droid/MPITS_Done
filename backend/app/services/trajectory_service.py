import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from ..models import Match, Camera, TrajectoryCache, MissingPerson

logger = logging.getLogger(__name__)

def update_trajectory_cache(db: Session, person_id: int):
    """
    Finds all confirmed matches for a person, orders them chronologically,
    and updates the trajectory_cache table.
    """
    confirmed_matches = db.query(Match).filter(
        Match.missing_person_id == person_id,
        Match.review_status == "confirmed"
    ).order_by(Match.matched_at.asc()).all()
    
    camera_ids = [m.camera_id for m in confirmed_matches]
    
    # Try to find existing cache entry
    cache_entry = db.query(TrajectoryCache).filter(
        TrajectoryCache.missing_person_id == person_id
    ).first()
    
    if cache_entry:
        cache_entry.ordered_camera_ids = json.dumps(camera_ids)
    else:
        cache_entry = TrajectoryCache(
            missing_person_id=person_id,
            ordered_camera_ids=json.dumps(camera_ids)
        )
        db.add(cache_entry)
        
    db.commit()
    return cache_entry

def get_trajectory_for_person(db: Session, person_id: int) -> dict:
    """
    Reconstructs the chronological trajectory list for a missing person.
    Returns:
    {
        "missing_person_id": int,
        "name": str,
        "status": str,
        "trajectory": [
            {
                "camera_code": str,
                "location_name": str,
                "latitude": float,
                "longitude": float,
                "timestamp": datetime,
                "confidence": float,
                "matched_frame_path": str
            },
            ...
        ],
        "probable_search_area": str
    }
    """
    person = db.query(MissingPerson).filter(MissingPerson.id == person_id).first()
    if not person:
        return {"error": "Missing person not found"}
        
    # Get all confirmed matches
    matches = db.query(Match).filter(
        Match.missing_person_id == person_id,
        Match.review_status == "confirmed"
    ).order_by(Match.matched_at.asc()).all()
    
    trajectory_points = []
    for m in matches:
        camera = db.query(Camera).filter(Camera.id == m.camera_id).first()
        if not camera:
            continue
            
        trajectory_points.append({
            "camera_code": camera.camera_code,
            "location_name": camera.location_name,
            "latitude": camera.latitude,
            "longitude": camera.longitude,
            "timestamp": m.matched_at,
            "confidence": m.confidence_score,
            "matched_frame_path": m.matched_frame_path
        })
        
    # Infer probable search area (last sighting location)
    probable_area = "Unknown (No sightings confirmed yet)"
    if trajectory_points:
        last_point = trajectory_points[-1]
        probable_area = f"Radius of 500m around {last_point['location_name']}"
        
    return {
        "missing_person_id": person.id,
        "name": person.name,
        "status": person.status,
        "trajectory": trajectory_points,
        "probable_search_area": probable_area
    }
