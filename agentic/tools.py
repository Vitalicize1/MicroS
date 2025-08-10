from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime, date
import json

from app.db import SessionLocal
from app.models import Food, MealLog, User
from app.barcode import lookup_upc, search_food_by_name
from app.nutrition import compute_totals

def tool_search_food(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search for food items by name"""
    db = SessionLocal()
    try:
        foods = search_food_by_name(db, query, limit)
        return [
            {
                "id": food.id,
                "name": food.name,
                "brand": food.brand,
                "upc": food.upc,
                "calories": food.calories,
                "protein_g": food.protein_g,
                "fat_g": food.fat_g,
                "carbs_g": food.carbs_g
            }
            for food in foods
        ]
    finally:
        db.close()

def tool_lookup_upc(upc: str) -> List[Dict[str, Any]]:
    """Lookup food by UPC code"""
    db = SessionLocal()
    try:
        foods = lookup_upc(db, upc)
        return [
            {
                "id": food.id,
                "name": food.name,
                "brand": food.brand,
                "upc": food.upc,
                "calories": food.calories,
                "protein_g": food.protein_g,
                "fat_g": food.fat_g,
                "carbs_g": food.carbs_g
            }
            for food in foods
        ]
    finally:
        db.close()

def tool_log_meal(user_id: int, food_id: int, grams: float, meal_type: str = "snack", notes: str = None) -> Dict[str, Any]:
    """Log a meal for a user"""
    db = SessionLocal()
    try:
        # Verify user and food exist
        user = db.query(User).filter(User.id == user_id).first()
        food = db.query(Food).filter(Food.id == food_id).first()
        
        if not user:
            return {"error": "User not found"}
        if not food:
            return {"error": "Food not found"}
        
        # Create meal log
        meal_log = MealLog(
            user_id=user_id,
            food_id=food_id,
            grams=grams,
            meal_type=meal_type,
            notes=notes
        )
        
        db.add(meal_log)
        db.commit()
        db.refresh(meal_log)
        
        return {
            "id": meal_log.id,
            "user_id": meal_log.user_id,
            "food_id": meal_log.food_id,
            "food_name": food.name,
            "grams": meal_log.grams,
            "meal_type": meal_log.meal_type,
            "logged_at": meal_log.logged_at.isoformat()
        }
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()

def tool_compute_day(user_id: int, date_iso: str = None) -> Dict[str, Any]:
    """Compute nutrition totals for a user on a specific date"""
    db = SessionLocal()
    try:
        # Parse date
        if date_iso:
            target_date = datetime.fromisoformat(date_iso).date()
        else:
            target_date = date.today()
        
        # Get meal logs for the date
        start_datetime = datetime.combine(target_date, datetime.min.time())
        end_datetime = datetime.combine(target_date, datetime.max.time())
        
        meal_logs = db.query(MealLog).filter(
            MealLog.user_id == user_id,
            MealLog.logged_at >= start_datetime,
            MealLog.logged_at <= end_datetime
        ).all()
        
        # Compute totals
        totals = compute_totals(meal_logs)
        
        return {
            "date": target_date.isoformat(),
            "meal_count": len(meal_logs),
            "totals": {
                "calories": totals.calories,
                "protein_g": totals.protein_g,
                "fat_g": totals.fat_g,
                "carbs_g": totals.carbs_g,
                "vitamin_a_rae": totals.vitamin_a_rae,
                "vitamin_c_mg": totals.vitamin_c_mg,
                "vitamin_d_iu": totals.vitamin_d_iu,
                "vitamin_e_mg": totals.vitamin_e_mg,
                "vitamin_k_mcg": totals.vitamin_k_mcg,
                "calcium_mg": totals.calcium_mg,
                "iron_mg": totals.iron_mg,
                "magnesium_mg": totals.magnesium_mg,
                "zinc_mg": totals.zinc_mg,
                "potassium_mg": totals.potassium_mg,
                "sodium_mg": totals.sodium_mg
            },
            "meals": [
                {
                    "id": log.id,
                    "food_name": log.food.name,
                    "grams": log.grams,
                    "meal_type": log.meal_type,
                    "logged_at": log.logged_at.isoformat()
                }
                for log in meal_logs
            ]
        }
    finally:
        db.close()

def tool_get_user_goals(user_id: int) -> Dict[str, Any]:
    """Get user's nutrition goals"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}
        
        return user.prefs.get("goals", {})
    finally:
        db.close()

def tool_set_user_goals(user_id: int, goals: Dict[str, float]) -> Dict[str, Any]:
    """Set user's nutrition goals"""
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
