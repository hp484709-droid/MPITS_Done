import cv2
import numpy as np
import logging
import os

logger = logging.getLogger(__name__)

# Try to import face_recognition. If it fails, we will fall back to YuNet + SFace or OpenCV.
HAS_FACE_RECOGNITION = False
try:
    import face_recognition
    HAS_FACE_RECOGNITION = True
    logger.info("face_recognition library loaded successfully.")
except ImportError:
    logger.warning("face_recognition library not found. Falling back to YuNet/OpenCV-based detection.")

# Setup paths for local deep learning models (YuNet and SFace)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
YUNET_PATH = os.path.join(PROJECT_ROOT, "models", "face_detection_yunet_2023mar.onnx")
SFACE_PATH = os.path.join(PROJECT_ROOT, "models", "face_recognition_sface_2021dec.onnx")

# Load OpenCV Haar cascade face detector as a second-level fallback
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def get_face_locations(image_array: np.ndarray) -> list:
    """
    Detects faces in an image.
    Returns a list of tuples: (top, right, bottom, left)
    """
    if HAS_FACE_RECOGNITION:
        try:
            # face_recognition returns (top, right, bottom, left)
            return face_recognition.face_locations(image_array)
        except Exception as e:
            logger.error(f"Error in face_recognition.face_locations: {e}. Falling back.")
            
    # Try YuNet deep learning face detector first
    if os.path.exists(YUNET_PATH):
        try:
            h, w = image_array.shape[:2]
            detector = cv2.FaceDetectorYN.create(YUNET_PATH, "", (w, h))
            retval, faces = detector.detect(image_array)
            if faces is not None:
                locations = []
                for face in faces:
                    x, y, w_box, h_box = face[0:4].astype(int)
                    top = max(0, y)
                    left = max(0, x)
                    bottom = min(h, y + h_box)
                    right = min(w, x + w_box)
                    locations.append((top, right, bottom, left))
                return locations
        except Exception as e:
            logger.error(f"Error in YuNet get_face_locations: {e}. Falling back to Haar Cascade.")

    # Fallback to standard Haar Cascade
    gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(40, 40)
    )
    
    locations = []
    for (x, y, w, h) in faces:
        locations.append((int(y), int(x + w), int(y + h), int(x)))
    return locations

def get_embedding(image_array: np.ndarray, location: tuple) -> list:
    """
    Generates a 128-dimensional embedding vector for a face at the specified location.
    location: (top, right, bottom, left)
    Returns a list of 128 floats.
    """
    top, right, bottom, left = location
    
    if HAS_FACE_RECOGNITION:
        try:
            encodings = face_recognition.face_encodings(image_array, [location])
            if len(encodings) > 0:
                return encodings[0].tolist()
        except Exception as e:
            logger.error(f"Error generating embedding with face_recognition: {e}. Falling back.")

    # Try deep learning SFace model for highly accurate 128-d embeddings
    if os.path.exists(SFACE_PATH) and os.path.exists(YUNET_PATH):
        try:
            h, w = image_array.shape[:2]
            # Run YuNet to get the face crop with landmarks needed for alignment
            detector = cv2.FaceDetectorYN.create(YUNET_PATH, "", (w, h))
            retval, faces = detector.detect(image_array)
            if faces is not None:
                # Find face closest to input location box center
                best_face = None
                min_dist = float('inf')
                loc_center_y = (top + bottom) / 2
                loc_center_x = (left + right) / 2
                
                for face in faces:
                    x, y, w_box, h_box = face[0:4].astype(int)
                    face_center_y = y + h_box / 2
                    face_center_x = x + w_box / 2
                    dist = (face_center_y - loc_center_y)**2 + (face_center_x - loc_center_x)**2
                    if dist < min_dist:
                        min_dist = dist
                        best_face = face
                
                if best_face is not None:
                    # Align crop and extract SFace embedding
                    recognizer = cv2.FaceRecognizerSF.create(SFACE_PATH, "")
                    aligned = recognizer.alignCrop(image_array, best_face)
                    feature = recognizer.feature(aligned)
                    return feature[0].tolist()
        except Exception as e:
            logger.error(f"Error in SFace get_embedding: {e}. Falling back to pixel template matching.")

    # Second-level fallback: Extract raw face crop template matching
    try:
        height, width = image_array.shape[:2]
        # Safeguard boundaries
        top_safe = max(0, int(top))
        bottom_safe = min(height, int(bottom))
        left_safe = max(0, int(left))
        right_safe = min(width, int(right))
        
        face_crop = image_array[top_safe:bottom_safe, left_safe:right_safe]
        if face_crop.size == 0:
            return [0.0] * 128
            
        # Resize to 8x16 = 128 pixels
        resized = cv2.resize(face_crop, (8, 16))
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        
        # Flatten and normalize to unit vector (L2 norm)
        flat = gray.flatten().astype(float)
        norm = np.linalg.norm(flat)
        if norm > 0:
            flat = flat / norm
            
        return flat.tolist()
    except Exception as e:
        logger.error(f"Error in fallback get_embedding: {e}")
        return [0.0] * 128
