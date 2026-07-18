import numpy as np
import json
import logging
from sqlalchemy.orm import Session
from ..models import MissingPerson

logger = logging.getLogger(__name__)

def search_missing_persons(db: Session, query_embedding: list, k: int = 10) -> list:
    """
    Compares the query embedding against all active missing persons in the database.
    Uses Cosine Similarity (dot product for normalized SFace embeddings).
    Returns a ranked list of dictionaries:
    [
        {"person": MissingPerson_object, "distance": float, "confidence": float},
        ...
    ]
    Sorted by confidence descending.
    """
    # Fetch all active missing persons with embeddings
    active_persons = db.query(MissingPerson).filter(MissingPerson.status == "active").all()
    if not active_persons:
        return []
        
    candidates = []
    embeddings_list = []
    valid_persons = []
    
    for p in active_persons:
        if p.embedding_vector:
            try:
                emb = json.loads(p.embedding_vector)
                if len(emb) == 128:
                    embeddings_list.append(emb)
                    valid_persons.append(p)
            except Exception as e:
                logger.error(f"Error parsing embedding for person {p.id}: {e}")
                
    if not embeddings_list:
        return []
        
    query_arr = np.array(query_embedding, dtype=np.float32).reshape(1, -1)
    db_arr = np.array(embeddings_list, dtype=np.float32)
    
    # Calculate cosine similarity using dot product (SFace embeddings are L2 normalized)
    similarities = np.dot(db_arr, query_arr.reshape(-1))
    
    # Sort indices by similarity descending
    sorted_idx = np.argsort(similarities)[::-1]
    actual_k = min(k, len(valid_persons))
    indices = sorted_idx[:actual_k].tolist()
    scores = similarities[indices].tolist()

    results = []
    for rank, idx in enumerate(indices):
        if idx < 0 or idx >= len(valid_persons):
            continue
        person = valid_persons[idx]
        similarity = float(scores[rank])
        
        # SFace cosine similarity threshold is 0.363 for face verification.
        # We map the threshold 0.363 to 70% confidence (the dashboard alert cutoff).
        if similarity >= 0.363:
            # Scale from [0.363, 1.0] similarity to [70.0, 100.0] confidence
            confidence = 70.0 + (similarity - 0.363) / (1.0 - 0.363) * 30.0
        else:
            # Scale from [-1.0, 0.363] similarity to [0.0, 70.0] confidence
            confidence = max(0.0, (similarity + 1.0) / 1.363 * 70.0)
            
        results.append({
            "person": person,
            "distance": float(1.0 - similarity),  # distance-like metric for API compatibility
            "confidence": round(confidence, 2)
        })
        
    # Sort results by confidence descending
    results.sort(key=lambda x: x["confidence"], reverse=True)
    return results
