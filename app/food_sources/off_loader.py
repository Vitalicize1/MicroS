"""
Open Food Facts (OFF) simple integration.
- Public API: no key required.
- We normalize a minimal subset (name, brand, barcode, macros) and leave micronutrients best-effort.
"""
import requests
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from ..models import Food

OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"
OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product/{}"

def _normalize_off_product(prod: Dict[str, Any]) -> Dict[str, Any]:
    nutrients = prod.get('nutriments') or {}
    def g(key: str) -> float:
        try:
            return float(nutrients.get(key) or 0)
        except Exception:
            return 0.0
    return {
        'id': -(abs(hash(prod.get('code') or prod.get('id') or prod.get('_id') or '0')) % 10_000_000),
        'name': prod.get('product_name') or prod.get('generic_name') or 'Unknown Product',
        'brand': (prod.get('brands') or 'Generic').split(',')[0].strip(),
        'upc': prod.get('code') or '',
        'data_source': 'off',
        'source': 'off',
        'image_url': prod.get('image_front_url') or prod.get('image_url') or prod.get('image_small_url') or '',
        'calories': g('energy-kcal_100g'),
        'protein_g': g('proteins_100g'),
        'fat_g': g('fat_100g'),
        'carbs_g': g('carbohydrates_100g'),
        # Basic micronutrients if available (per 100g)
        'vitamin_c_mg': g('vitamin-c_100g'),
        'calcium_mg': g('calcium_100g') * 1000 if g('calcium_100g') < 10 else g('calcium_100g'),
        'iron_mg': g('iron_100g'),
        'sodium_mg': g('sodium_100g') * 1000 if g('sodium_100g') and g('sodium_100g') < 10 else g('sodium_100g'),
        'potassium_mg': g('potassium_100g') * 1000 if g('potassium_100g') and g('potassium_100g') < 10 else g('potassium_100g'),
    }

def search_off_foods(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    params = {
        'search_terms': query,
        'search_simple': 1,
        'json': 1,
        'page_size': limit,
    }
    try:
        r = requests.get(OFF_SEARCH_URL, params=params, timeout=8)
        r.raise_for_status()
        data = r.json() or {}
        prods = (data.get('products') or [])[:limit]
        return [_normalize_off_product(p) for p in prods]
    except requests.RequestException:
        return []

def get_off_food_details(barcode: str) -> Dict[str, Any]:
    try:
        r = requests.get(OFF_PRODUCT_URL.format(barcode), timeout=8)
        r.raise_for_status()
        data = r.json() or {}
        prod = (data.get('product') or {})
        return _normalize_off_product(prod)
    except requests.RequestException:
        return {}

def load_off_food_to_db(db: Session, barcode: str) -> Optional[Food]:
    info = get_off_food_details(barcode)
    if not info:
        return None
    # Create or upsert minimal Food entry
    existing = db.query(Food).filter(Food.upc == info['upc']).first()
    if existing:
        return existing
    food = Food(
        name=info['name'],
        brand=info['brand'],
        upc=info['upc'],
        calories=info.get('calories') or 0,
        protein_g=info.get('protein_g') or 0,
        fat_g=info.get('fat_g') or 0,
        carbs_g=info.get('carbs_g') or 0,
        vitamin_c_mg=info.get('vitamin_c_mg') or 0,
        calcium_mg=info.get('calcium_mg') or 0,
        iron_mg=info.get('iron_mg') or 0,
        potassium_mg=info.get('potassium_mg') or 0,
        sodium_mg=info.get('sodium_mg') or 0,
        data_source='off'
    )
    db.add(food)
    db.commit()
    db.refresh(food)
    return food
