from typing import Dict, Any, List
from datetime import datetime, timedelta, date

from app.db import SessionLocal
from app.models import MealLog
from app.nutrition import compute_totals
from .registry import TOOL_REGISTRY, ToolSpec


def tool_compute_day(user_id: int, date_iso: str = None) -> Dict[str, Any]:
    """Compute nutrition totals for a user on a specific date (UTC day)."""
    db = SessionLocal()
    try:
        if date_iso:
            target_date = datetime.fromisoformat(date_iso).date()
        else:
            # Use UTC date to match MealLog.logged_at default (datetime.utcnow)
            target_date = datetime.utcnow().date()
        start_datetime = datetime.combine(target_date, datetime.min.time())
        end_datetime = datetime.combine(target_date, datetime.max.time())
        meal_logs = db.query(MealLog).filter(
            MealLog.user_id == user_id,
            MealLog.logged_at >= start_datetime,
            MealLog.logged_at <= end_datetime
        ).all()
        totals = compute_totals(meal_logs)
        return {
            "date": target_date.isoformat(),
            "meal_count": len(meal_logs),
            "totals": totals.dict() if hasattr(totals, 'dict') else totals.__dict__,
            "meals": [
                {
                    "id": log.id,
                    "food_name": log.food.name if log.food else None,
                    "grams": log.grams,
                    "meal_type": log.meal_type,
                    "logged_at": log.logged_at.isoformat(),
                }
                for log in meal_logs
            ],
        }
    finally:
        db.close()


def tool_compute_range(user_id: int, start_date_iso: str, end_date_iso: str) -> Dict[str, Any]:
    """Compute rollup totals across an inclusive date range."""
    start_d = datetime.fromisoformat(start_date_iso).date()
    end_d = datetime.fromisoformat(end_date_iso).date()
    if end_d < start_d:
        start_d, end_d = end_d, start_d

    days: List[Dict[str, Any]] = []
    current = start_d
    grand_totals = None
    while current <= end_d:
        day = tool_compute_day(user_id, current.isoformat())
        days.append(day)
        if grand_totals is None:
            grand_totals = day["totals"].copy()
        else:
            for k, v in day["totals"].items():
                if isinstance(v, (int, float)):
                    grand_totals[k] = grand_totals.get(k, 0) + v
        current += timedelta(days=1)

    return {"start": start_d.isoformat(), "end": end_d.isoformat(), "days": days, "totals": grand_totals}


# Register
TOOL_REGISTRY.register(ToolSpec(
    name="tool_compute_day",
    func=tool_compute_day,
    description="Compute daily totals for a user",
    schema={"type": "object", "properties": {"user_id": {"type": "integer"}, "date_iso": {"type": "string"}}}
))

TOOL_REGISTRY.register(ToolSpec(
    name="tool_compute_range",
    func=tool_compute_range,
    description="Compute totals across a date range",
    schema={"type": "object", "properties": {"user_id": {"type": "integer"}, "start_date_iso": {"type": "string"}, "end_date_iso": {"type": "string"}}}
))
