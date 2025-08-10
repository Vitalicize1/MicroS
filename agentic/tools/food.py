from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Food
from app.barcode import lookup_upc as _lookup_upc, search_food_by_name as _search_food_by_name
from .registry import TOOL_REGISTRY, ToolSpec


def tool_search_food(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search for food items by name (ILIKE). Returns basic fields for UI display."""
    db = SessionLocal()
    try:
        foods = _search_food_by_name(db, query, limit)
        return [
            {
                "id": f.id,
                "name": f.name,
                "brand": f.brand,
                "upc": f.upc,
                "calories": f.calories,
                "protein_g": f.protein_g,
                "fat_g": f.fat_g,
                "carbs_g": f.carbs_g,
            }
            for f in foods
        ]
    finally:
        db.close()


def tool_lookup_upc(upc: str) -> List[Dict[str, Any]]:
    """Lookup foods by UPC (exact)."""
    db = SessionLocal()
    try:
        foods = _lookup_upc(db, upc)
        return [
            {
                "id": f.id,
                "name": f.name,
                "brand": f.brand,
                "upc": f.upc,
                "calories": f.calories,
                "protein_g": f.protein_g,
                "fat_g": f.fat_g,
                "carbs_g": f.carbs_g,
            }
            for f in foods
        ]
    finally:
        db.close()


def tool_list_foods(limit: int = 25, offset: int = 0) -> List[Dict[str, Any]]:
    """List foods for browsing (paginated)."""
    db = SessionLocal()
    try:
        q = db.query(Food).order_by(Food.id.asc()).offset(offset).limit(limit)
        return [
            {
                "id": f.id,
                "name": f.name,
                "brand": f.brand,
                "upc": f.upc,
                "calories": f.calories,
                "protein_g": f.protein_g,
                "fat_g": f.fat_g,
                "carbs_g": f.carbs_g,
            }
            for f in q.all()
        ]
    finally:
        db.close()


# Register tools
TOOL_REGISTRY.register(ToolSpec(
    name="tool_search_food",
    func=tool_search_food,
    description="Search foods by name (ILIKE)",
    schema={"type": "object", "properties": {"query": {"type": "string"}, "limit": {"type": "integer"}}}
))

TOOL_REGISTRY.register(ToolSpec(
    name="tool_lookup_upc",
    func=tool_lookup_upc,
    description="Lookup food by 12-digit UPC",
    schema={"type": "object", "properties": {"upc": {"type": "string"}}}
))

TOOL_REGISTRY.register(ToolSpec(
    name="tool_list_foods",
    func=tool_list_foods,
    description="List foods (paginated)",
    schema={"type": "object", "properties": {"limit": {"type": "integer"}, "offset": {"type": "integer"}}}
))
