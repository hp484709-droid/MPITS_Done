import cv2
import numpy as np
import base64
import os
from fastapi import UploadFile

def base64_to_cv2(b64_string: str) -> np.ndarray:
    """
    Converts a base64 encoded image string (optionally containing the data URI prefix)
    into a BGR OpenCV image (numpy array).
    """
    if "," in b64_string:
        b64_string = b64_string.split(",")[1]
    
    img_data = base64.b64decode(b64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def cv2_to_base64(img: np.ndarray, ext: str = ".jpg") -> str:
    """
    Converts a BGR OpenCV image (numpy array) to a base64 string.
    """
    _, buffer = cv2.imencode(ext, img)
    b64_bytes = base64.b64encode(buffer)
    b64_str = b64_bytes.decode("utf-8")
    return f"data:image/jpeg;base64,{b64_str}"

def save_cv2_image(img: np.ndarray, file_path: str):
    """
    Saves an OpenCV BGR image to a file path, ensuring parent folders exist.
    """
    dir_name = os.path.dirname(file_path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    cv2.imwrite(file_path, img)

def save_upload_file(upload_file: UploadFile, file_path: str):
    """
    Saves a FastAPI UploadFile to a local path, ensuring parent folders exist.
    """
    dir_name = os.path.dirname(file_path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        buffer.write(upload_file.file.read())
