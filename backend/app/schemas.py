from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "operator"
    email: Optional[str] = None
    phone: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    email: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True

# Missing Person Schemas
class MissingPersonBase(BaseModel):
    name: str
    age: int
    gender: str
    last_seen_date: Optional[str] = None
    last_seen_location: Optional[str] = None
    complainant_name: Optional[str] = None
    complainant_contact: Optional[str] = None

class MissingPersonCreate(MissingPersonBase):
    pass

class MissingPersonResponse(MissingPersonBase):
    id: int
    photo_path: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Camera Schemas
class CameraBase(BaseModel):
    camera_code: str
    location_name: str
    latitude: float
    longitude: float
    rtsp_url: Optional[str] = None
    is_active: bool = True

class CameraCreate(CameraBase):
    pass

class CameraResponse(CameraBase):
    id: int

    class Config:
        from_attributes = True

# Match Schemas
class MatchResponse(BaseModel):
    id: int
    missing_person_id: int
    camera_id: int
    confidence_score: float
    matched_frame_path: Optional[str] = None
    matched_at: datetime
    review_status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None

    # Optional nested details for UI convenience
    missing_person: Optional[MissingPersonResponse] = None
    camera: Optional[CameraResponse] = None

    class Config:
        from_attributes = True

class MatchReview(BaseModel):
    decision: str  # confirmed or rejected

# Trajectory Schemas
class TrajectoryPoint(BaseModel):
    camera_code: str
    location_name: str
    latitude: float
    longitude: float
    timestamp: datetime
    confidence: float
    matched_frame_path: str

class TrajectoryResponse(BaseModel):
    missing_person_id: int
    name: str
    status: str
    trajectory: List[TrajectoryPoint]
    probable_search_area: Optional[str] = None

# Family Shortlist Schemas
class ShortlistCandidate(BaseModel):
    match_id: int
    person_id: int
    confidence: float
    photo_url: str  # Link to matched_frame_path

class FamilyShortlistResponse(BaseModel):
    token: str
    missing_person_name: str
    candidates: List[ShortlistCandidate]
    status: str  # pending, responded

class FamilyShortlistSelect(BaseModel):
    selected_match_id: Optional[int] = None  # None/null means 'None of these'
