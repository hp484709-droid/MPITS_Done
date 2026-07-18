import os

# System Parameters and Configuration Values
FRAME_SAMPLE_RATE = 2            # Sample every Nth frame
FACE_DETECTOR_MODEL = "HOG"      # HOG or CNN (fallback to Haar Cascade in code)
EMBEDDING_MODEL = "dlib"         # dlib ResNet-34 or fallback
EMBEDDING_DIMENSION = 128        # Dimensions of the embedding vector
MATCH_THRESHOLD = 0.55           # Maximum distance for positive match (Euclidean)
ALERT_CONFIDENCE_CUTOFF = 70.0   # Minimum confidence % to trigger alert
FAMILY_RESPONSE_WINDOW = 24      # Hours allowed for family response

# File Storage
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "mdb_images")
MATCH_DIR = os.path.join(BASE_DIR, "matched_frames")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(MATCH_DIR, exist_ok=True)

# Database
DATABASE_URL = "sqlite:///./mpits.db"

# JWT Auth
SECRET_KEY = "super-secret-pastel-key-for-mpits-development"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
