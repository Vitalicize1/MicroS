from typing import Dict, Any

from app.db import SessionLocal
from app.models import User
from .registry import TOOL_REGISTRY, ToolSpec


def tool_get_user_goals(user_id: int) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}
        return user.prefs.get("goals", {}) if user.prefs else {}
    finally:
        db.close()


def tool_set_user_goals(user_id: int, goals: Dict[str, float]) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}
        if not user.prefs:
            user.prefs = {}
        user.prefs["goals"] = goals
        db.commit()
        return {"success": True, "goals": goals}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()


# Register
TOOL_REGISTRY.register(ToolSpec(
    name="tool_get_user_goals",
    func=tool_get_user_goals,
    description="Get user's micronutrient goals",
    schema={"type":"object","properties":{"user_id":{"type":"integer"}}}
))

TOOL_REGISTRY.register(ToolSpec(
    name="tool_set_user_goals",
    func=tool_set_user_goals,
    description="Set user's micronutrient goals",
    schema={"type":"object","properties":{"user_id":{"type":"integer"},"goals":{"type":"object","additionalProperties":{"type":"number"}}}}
))
