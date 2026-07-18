import secrets
import logging
from datetime import datetime
import json
from sqlalchemy.orm import Session
from ..models import Match, FamilyNotification, MissingPerson
from ..config import ALERT_CONFIDENCE_CUTOFF

logger = logging.getLogger(__name__)

def create_match_record(db: Session, person_id: int, camera_id: int, confidence: float, matched_frame_path: str) -> Match:
    """
    Creates a new match record in the database.
    """
    new_match = Match(
        missing_person_id=person_id,
        camera_id=camera_id,
        confidence_score=confidence,
        matched_frame_path=matched_frame_path,
        review_status="pending"
    )
    db.add(new_match)
    db.commit()
    db.refresh(new_match)
    return new_match

def trigger_alert_if_eligible(db: Session, person_id: int, match_id: int, confidence: float) -> bool:
    """
    If the match confidence is high enough, packages the match and sends alert.
    For the prototype, we package the matches of this person and generate a family notification.
    """
    if confidence < ALERT_CONFIDENCE_CUTOFF:
        return False
        
    # Get other recent matches for this person to build a shortlist (up to 5 candidates)
    recent_matches = db.query(Match).filter(
        Match.missing_person_id == person_id,
        Match.review_status == "pending"
    ).order_by(Match.confidence_score.desc()).limit(5).all()
    
    match_ids = [m.id for m in recent_matches]
    if match_id not in match_ids:
        match_ids.append(match_id)
        
    # Create family notification
    token = secrets.token_urlsafe(16)
    notification = FamilyNotification(
        missing_person_id=person_id,
        shortlist_match_ids=json.dumps(match_ids),
        secure_link_token=token,
        family_response="pending",
        location_details_sent=False
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    # Retrieve missing person details for log email simulation
    person = db.query(MissingPerson).filter(MissingPerson.id == person_id).first()
    person_name = person.name if person else f"Person ID {person_id}"
    
    # Mock sending email / SMS
    simulated_link = f"http://localhost:5173/family/shortlist/{token}"
    logger.info(f"=== SIMULATED NOTIFICATION SENT ===")
    logger.info(f"Recipient: Family of {person_name}")
    logger.info(f"Message: A potential match has been detected on camera! Please review the matches at: {simulated_link}")
    logger.info(f"====================================")
    
    # Print to console so it shows up in dev logs clearly
    print(f"\n[ALERT] Simulated Email Sent to Family of {person_name}!")
    print(f"[ALERT] Shortlist Verification Link: {simulated_link}\n")
    
    return True
