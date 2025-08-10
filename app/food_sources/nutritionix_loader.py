"""
Nutritionix provider (free tier-friendly). This module is optional and only used
when credentials are present.

Env support:
- NUTRITIONIX_APP_ID + NUTRITIONIX_APP_KEY (preferred)
- NUTRITIONIX_KEY (fallback: used for both app-id and key headers)
"""
from __future__ import annotations

import os
from typing import Dict, Any, List, Optional

import requests
from dotenv import load_dotenv

load_dotenv()

API_BASE = "https://trackapi.nutritionix.com/v2"


def _headers() -> Optional[Dict[str, str]]:
    app_id = os.getenv("NUTRITIONIX_APP_ID")
    app_key = os.getenv("NUTRITIONIX_APP_KEY")
    single = os.getenv("NUTRITIONIX_KEY")
    if not (app_id and app_key) and not single:
        return None
    return {
        "x-app-id": app_id or single or "",
        "x-app-key": app_key or single or "",
        "Content-Type": "application/json",
    }


def available() -> bool:
    return _headers() is not None


def _normalize_item(doc: Dict[str, Any]) -> Dict[str, Any]:
    # Nutritionix fields (branded):
    # brand_name, food_name, nix_item_id, upc, nf_calories, nf_protein, nf_total_fat, nf_total_carbohydrate
    upc = doc.get("upc") or doc.get("gtin_upc") or ""
    name = doc.get("food_name") or doc.get("item_name") or "Unknown"
    brand = doc.get("brand_name") or doc.get("brand_name_item") or "Generic"
    # Macronutrients
    calories = float(doc.get("nf_calories") or 0)
    protein_g = float(doc.get("nf_protein") or 0)
    fat_g = float(doc.get("nf_total_fat") or 0)
    carbs_g = float(doc.get("nf_total_carbohydrate") or 0)

    # Some micronutrients are available in full_nutrients (array), provide best-effort mapping
    micronutrients = {}
    full = doc.get("full_nutrients") or []
    # Nutritionix full_nutrients uses attr_id codes; we map common few
    nx_map = {
        318: ("vitamin_a_rae", 1.0),
        401: ("vitamin_c_mg", 1.0),
        328: ("vitamin_d_iu", 1.0),
        323: ("vitamin_e_mg", 1.0),
        430: ("vitamin_k_mcg", 1.0),
        301: ("calcium_mg", 1.0),
        303: ("iron_mg", 1.0),
        304: ("magnesium_mg", 1.0),
        305: ("phosphorus_mg", 1.0),
        306: ("potassium_mg", 1.0),
        307: ("sodium_mg", 1.0),
        309: ("zinc_mg", 1.0),
        312: ("copper_mg", 1.0),
        315: ("manganese_mg", 1.0),
        454: ("choline_mg", 1.0),
    }
    for item in full:
        try:
            attr_id = int(item.get("attr_id"))
            val = float(item.get("value") or 0)
            if attr_id in nx_map:
                key, mult = nx_map[attr_id]
                micronutrients[key] = val * mult
        except Exception:
            continue

    # Completeness heuristic
    completeness = 0
    for k in ("calories", "protein_g", "fat_g", "carbs_g"):
        if locals()[k]:
            completeness += 1
    completeness += sum(1 for v in micronutrients.values() if v)

    return {
        "id": -(abs(hash(upc or name)) % 10_000_000),
        "name": name,
        "brand": brand,
        "upc": upc,
        "data_type": "Branded",
        "source": "nutritionix",
        "image_url": doc.get("photo", {}).get("thumb") or doc.get("photo", {}).get("highres") or "",
        "calories": calories,
        "protein_g": protein_g,
        "fat_g": fat_g,
        "carbs_g": carbs_g,
        **micronutrients,
        "completeness_score": completeness,
    }


def search_nx_foods(query: str, limit: int = 25) -> List[Dict[str, Any]]:
    """Search Nutritionix and return normalized branded items. Best-effort details for top N."""
    hdrs = _headers()
    if not hdrs:
        return []
    try:
        r = requests.get(f"{API_BASE}/search/instant", params={"query": query, "detailed": True}, headers=hdrs, timeout=8)
        r.raise_for_status()
        js = r.json() or {}
        branded = (js.get("branded") or [])[:limit]
        return [_normalize_item(b) for b in branded]
    except requests.RequestException:
        return []


def get_nx_item_by_upc(upc: str) -> Dict[str, Any]:
    hdrs = _headers()
    if not hdrs:
        return {}
    try:
        r = requests.get(f"{API_BASE}/search/item", params={"upc": upc}, headers=hdrs, timeout=8)
        r.raise_for_status()
        js = r.json() or {}
        foods = js.get("foods") or []
        if foods:
            return _normalize_item(foods[0])
        return {}
    except requests.RequestException:
        return {}


