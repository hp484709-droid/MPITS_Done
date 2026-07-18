from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="operator")  # admin, operator, family
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)

class MissingPerson(Base):
    __tablename__ = "missing_persons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    last_seen_date = Column(String, nullable=True)
    last_seen_location = Column(String, nullable=True)
    complainant_name = Column(String, nullable=True)
    complainant_contact = Column(String, nullable=True)
    photo_path = Column(String, nullable=True)
    embedding_vector = Column(String, nullable=True)  # Stored as JSON serialized string of list
    status = Column(String, default="active")          # active, found
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    camera_code = Column(String, unique=True, index=True, nullable=False)
    location_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    rtsp_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    missing_person_id = Column(Integer, ForeignKey("missing_persons.id", ondelete="CASCADE"), nullable=False)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False)
    confidence_score = Column(Float, nullable=False)
    matched_frame_path = Column(String, nullable=True)
    matched_at = Column(DateTime(timezone=True), server_default=func.now())
    review_status = Column(String, default="pending")  # pending, confirmed, rejected
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

class TrajectoryCache(Base):
    __tablename__ = "trajectory_cache"

    id = Column(Integer, primary_key=True, index=True)
    missing_person_id = Column(Integer, ForeignKey("missing_persons.id", ondelete="CASCADE"), unique=True, nullable=False)
    ordered_camera_ids = Column(String, nullable=False)  # JSON list of camera IDs
    last_updated = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

class FamilyNotification(Base):
    __tablename__ = "family_notifications"

    id = Column(Integer, primary_key=True, index=True)
    missing_person_id = Column(Integer, ForeignKey("missing_persons.id", ondelete="CASCADE"), nullable=False)
    shortlist_match_ids = Column(String, nullable=False)  # JSON list of match IDs
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    secure_link_token = Column(String, unique=True, index=True, nullable=False)
    family_response = Column(String, default="pending")  # pending, selected, none
    selected_match_id = Column(Integer, ForeignKey("matches.id", ondelete="SET NULL"), nullable=True)
    responded_at = Column(DateTime, nullable=True)
    location_details_sent = Column(Boolean, default=False)
    location_sent_at = Column(DateTime, nullable=True)
