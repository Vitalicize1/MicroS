from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from datetime import date

from app.db import SessionLocal
from app.models import Food
from ..tools import tool_compute_day, tool_get_user_goals

class RecommendationAgent:
    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Propose 3–5 foods that best close the biggest micronutrient gaps.
        Uses current day's totals and user goals; excludes allergens if present in prefs (TODO).
        """
        user_id = state["user_id"]
        entities = state.get("entities", {})
        target_date = entities.get("date") or date.today().isoformat()

        # Gather current day totals and goals
        day_data = tool_compute_day(user_id, target_date)
        goals = tool_get_user_goals(user_id)
        totals = day_data.get("totals", {})

        # Compute gaps: goal - actual (only positive)
        gaps: Dict[str, float] = {}
        for k, goal in (goals or {}).items():
            try:
                actual = float(totals.get(k, 0.0))
                delta = float(goal) - actual
                if delta > 0:
                    gaps[k] = delta
            except Exception:
                continue

        if not gaps:
            state["response"] = "You're meeting your goals today. Nice work!"
            return state

        # Score foods by how much they close top gaps per 100g
        db = SessionLocal()
        try:
            foods: List[Food] = db.query(Food).all()
            ranked: List[Tuple[float, Food, Dict[str, float]]] = []
            top_gap_keys = sorted(gaps.keys(), key=lambda k: gaps[k], reverse=True)[:6]

            for food in foods:
                score = 0.0
                coverage: Dict[str, float] = {}
                for key in top_gap_keys:
                    value = getattr(food, key, None)
                    if isinstance(value, (int, float)) and value > 0:
                        # Assume 100g serving
                        covered = min(value, gaps[key])
                        coverage[key] = covered
                        score += covered / max(gaps[key], 1e-9)
                if score > 0:
                    ranked.append((score, food, coverage))

            ranked.sort(key=lambda x: x[0], reverse=True)
            picks = ranked[:5]

            if not picks:
                state["response"] = "I couldn't find foods that improve your biggest gaps from the current list."
                return state

            # Build response
            lines = ["Recommendations (100g servings):"]
            recs: List[Dict[str, Any]] = []
            for score, food, coverage in picks:
                why_bits = [f"{k}: +{v:.1f}" for k, v in coverage.items()]
                why = ", ".join(why_bits)
                lines.append(f"- {food.name} ({food.brand}) — covers {why}")
                recs.append({
                    "food_id": food.id,
                    "name": food.name,
                    "brand": food.brand,
                    "coverage": coverage,
                    "calories_per_100g": food.calories,
                })

            state["response"] = "\n".join(lines)
            state["recommendations"] = recs
            return state
        finally:
            db.close()
