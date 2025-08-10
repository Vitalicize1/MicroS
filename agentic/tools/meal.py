from typing import List, Dict, Any, Optional
from datetime import datetime

from app.db import SessionLocal
from app.models import MealLog, Food, User
from .registry import TOOL_REGISTRY, ToolSpec


def tool_log_meal(user_id: int, food_id: int, grams: float, meal_type: str = "snack", notes: str = None) -> Dict[str, Any]:
    """Create a meal log entry."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        food = db.query(Food).filter(Food.id == food_id).first()
        if not user:
            return {"error": "User not found"}
        if not food:
            return {"error": "Food not found"}
        log = MealLog(user_id=user_id, food_id=food_id, grams=grams, meal_type=meal_type, notes=notes)
        db.add(log)
        db.commit()
        db.refresh(log)
        return {
            "id": log.id,
            "user_id": log.user_id,
            "food_id": log.food_id,
            "food_name": food.name,
            "grams": log.grams,
            "meal_type": log.meal_type,
            "logged_at": log.logged_at.isoformat(),
        }
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()


def tool_update_meal(meal_id: int, grams: Optional[float] = None, meal_type: Optional[str] = None, notes: Optional[str] = None) -> Dict[str, Any]:
    """Update a meal log entry fields (grams, meal_type, notes)."""
    db = SessionLocal()
    try:
        log = db.query(MealLog).filter(MealLog.id == meal_id).first()
        if not log:
            return {"error": "Meal not found"}
        if grams is not None:
            log.grams = grams
        if meal_type is not None:
            log.meal_type = meal_type
        if notes is not None:
            log.notes = notes
        db.commit()
        db.refresh(log)
        return {
            "id": log.id,
            "user_id": log.user_id,
            "food_id": log.food_id,
            "grams": log.grams,
            "meal_type": log.meal_type,
            "logged_at": log.logged_at.isoformat(),
        }
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()


def tool_delete_meal(meal_id: int) -> Dict[str, Any]:
    """Delete a meal log entry by id."""
    db = SessionLocal()
    try:
        log = db.query(MealLog).filter(MealLog.id == meal_id).first()
        if not log:
            return {"error": "Meal not found"}
        db.delete(log)
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()


def tool_list_meals(user_id: int, limit: int = 25, offset: int = 0) -> List[Dict[str, Any]]:
    """List a user's meal logs (paginated)."""
    db = SessionLocal()
    try:
        q = (
            db.query(MealLog)
            .filter(MealLog.user_id == user_id)
            .order_by(MealLog.logged_at.desc())
            .offset(offset)
            .limit(limit)
        )
        items = []
        for log in q.all():
            items.append({
                "id": log.id,
                "food_id": log.food_id,
                "food_name": log.food.name if log.food else None,
                "grams": log.grams,
                "meal_type": log.meal_type,
                "logged_at": log.logged_at.isoformat(),
            })
        return items
    finally:
        db.close()


def tool_recent_foods(user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
    """Return distinct recently used foods for a user."""
    db = SessionLocal()
    try:
        sub = (
            db.query(MealLog.food_id, MealLog.logged_at)
            .filter(MealLog.user_id == user_id)
            .order_by(MealLog.logged_at.desc())
            .limit(200)
            .subquery()
        )
        food_ids = {row[0] for row in db.query(sub).all() if row[0] is not None}
        foods = (
            db.query(Food).filter(Food.id.in_(list(food_ids))).limit(limit).all()
            if food_ids else []
        )
        return [
            {
                "id": f.id,
                "name": f.name,
                "brand": f.brand,
                "calories": f.calories,
                "protein_g": f.protein_g,
                "fat_g": f.fat_g,
                "carbs_g": f.carbs_g,
            }
            for f in foods
        ]
    finally:
        db.close()


# Register
TOOL_REGISTRY.register(ToolSpec(
    name="tool_log_meal",
    func=tool_log_meal,
    description="Create a meal log entry",
    schema={"type": "object", "properties": {
        "user_id": {"type": "integer"},
        "food_id": {"type": "integer"},
        "grams": {"type": "number"},
        "meal_type": {"type": "string"},
        "notes": {"type": "string"},
    }}
))

TOOL_REGISTRY.register(ToolSpec(
    name="tool_update_meal",
    func=tool_update_meal,
    description="Update a meal log (grams, meal_type, notes)",
    schema={"type": "object", "properties": {
        "meal_id": {"type": "integer"},
        "grams": {"type": "number"},
        "meal_type": {"type": "string"},
        "notes": {"type": "string"},
    }}
))

TOOL_REGISTRY.register(ToolSpec(
    name="tool_delete_meal",
    func=tool_delete_meal,
    description="Delete a meal log by id",
    schema={"type": "object", "properties": {"meal_id": {"type": "integer"}}}
))

TOOL_REGISTRY.register(ToolSpec(
    name="tool_list_meals",
    func=tool_list_meals,
    description="List meals for a user",
    schema={"type": "object", "properties": {"user_id": {"type": "integer"}, "limit": {"type": "integer"}, "offset": {"type": "integer"}}}
))

TOOL_REGISTRY.register(ToolSpec(
    name="tool_recent_foods",
    func=tool_recent_foods,
    description="Return recent foods used by a user",
    schema={"type": "object", "properties": {"user_id": {"type": "integer"}, "limit": {"type": "integer"}}}
))
