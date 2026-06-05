import hashlib
import httpx
import math
import random
from config import settings

async def get_embedding(text: str) -> list[float]:
    """
    Get 768-dimensional embedding from Gemini's text-embedding-004 model.
    Falls back to a stable random vector if GEMINI_API_KEY is not configured or fails.
    """
    if not settings.GEMINI_API_KEY:
        # Fallback for development if API key is not configured
        # Seed by hashlib MD5 to ensure deterministic results across server restarts
        h = hashlib.md5(text.encode("utf-8")).hexdigest()
        seed = int(h, 16) % (2**32)
        random.seed(seed)
        return [random.uniform(-0.1, 0.1) for _ in range(768)]
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={settings.GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": "models/text-embedding-004",
        "content": {
            "parts": [{"text": text}]
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                return data["embedding"]["values"]
            else:
                print(f"Embedding API error: {response.status_code} - {response.text}")
                h = hashlib.md5(text.encode("utf-8")).hexdigest()
                seed = int(h, 16) % (2**32)
                random.seed(seed)
                return [random.uniform(-0.1, 0.1) for _ in range(768)]
        except Exception as e:
            print(f"Embedding API exception: {e}")
            h = hashlib.md5(text.encode("utf-8")).hexdigest()
            seed = int(h, 16) % (2**32)
            random.seed(seed)
            return [random.uniform(-0.1, 0.1) for _ in range(768)]

def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Calculate the cosine similarity between two vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    magnitude1 = math.sqrt(sum(a * a for a in v1))
    magnitude2 = math.sqrt(sum(b * b for b in v2))
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    return dot_product / (magnitude1 * magnitude2)
