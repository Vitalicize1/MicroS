from flask import Flask, request, jsonify
import os
import time
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import os
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from typing import Optional

from .db import get_db, create_tables, engine
from .models import User, Food, MealLog
from .schemas import AgentRequest, AgentResponse, AgentStructuredResponse, FoodCandidate, DaySummary, RecommendationItem, MealLog as MealLogSchema
from .barcode import lookup_upc
from agentic.graph import run_agent
from agentic.tools import tool_compute_day
from agentic.observability import setup_langsmith

# Enable observability (no-op if env not set)
setup_langsmith()

app = Flask(__name__)
# Allow cross-origin requests from frontend including Authorization header
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Authorization"],
)
app.config["JWT_SECRET"] = os.getenv("JWT_SECRET", "dev-secret-change-me")

# Simple in-memory cache for search responses
SEARCH_CACHE_TTL = int(os.getenv("SEARCH_CACHE_TTL", "1800"))  # 30 minutes default
SEARCH_CACHE: dict[str, dict] = {}

# Create tables on startup
with app.app_context():
    create_tables()

    # Lightweight SQLite column add (password_hash) if missing
    try:
        with engine.connect() as conn:
            # Check if column exists
            res = conn.execute(text("SELECT 1 FROM pragma_table_info('users') WHERE name='password_hash'"))
            exists = res.fetchone() is not None
            if not exists:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR"))
    except Exception as e:
        # Non-fatal; migration tools should handle in real deployments
        print(f"Warning: could not ensure users.password_hash column: {e}")

@app.route("/")
def root():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "message": "Micros API is running",
        "timestamp": datetime.utcnow().isoformat()
    })


# -------- Authentication helpers --------
def _create_jwt(user: User) -> str:
    payload = {
        "sub": user.id,
        "username": user.username,
        "iat": int(time.time()),
        "exp": int(time.time()) + 60 * 60 * 24 * 7,  # 7 days
    }
    token = jwt.encode(payload, app.config["JWT_SECRET"], algorithm="HS256")
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token


def _auth_user() -> Optional[User]:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, app.config["JWT_SECRET"], algorithms=["HS256"])  # type: ignore
        user_id = int(payload.get("sub"))
    except Exception:
        return None
    db = next(get_db())
    try:
        user = db.query(User).filter(User.id == user_id).first()
        return user
    finally:
        db.close()


@app.route("/auth/register", methods=["POST"])
def auth_register():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not username or not email or not password:
        return jsonify({"error": "username, email, password required"}), 400
    db = next(get_db())
    try:
        if db.query(User).filter((User.username == username) | (User.email == email)).first():
            return jsonify({"error": "username or email already exists"}), 409
        # Optional profile details
        birthday = data.get("birthday")  # ISO date
        age_val = None
        if birthday:
            try:
                # Compute age in years
                dt = datetime.fromisoformat(str(birthday))
                today = datetime.utcnow().date()
                age_val = today.year - dt.year - ((today.month, today.day) < (dt.month, dt.day))
            except Exception:
                age_val = None
        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
            prefs={"goals": {}},
            age=age_val,
            weight_kg=(data.get("weight_kg") or None),
            height_cm=(data.get("height_cm") or None),
            gender=(data.get("gender") or None),
            activity_level=(data.get("activity_level") or 'sedentary'),
            goal_type=(data.get("goal_type") or 'maintain'),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        token = _create_jwt(user)
        return jsonify({"token": token, "user": {"id": user.id, "username": user.username, "email": user.email}})
    finally:
        db.close()


@app.route("/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json() or {}
    username_or_email = (data.get("username") or data.get("email") or "").strip()
    password = data.get("password") or ""
    if not username_or_email or not password:
        return jsonify({"error": "username/email and password required"}), 400
    db = next(get_db())
    try:
        user = db.query(User).filter((User.username == username_or_email) | (User.email == username_or_email.lower())).first()
        if not user or not user.password_hash or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "invalid credentials"}), 401
        token = _create_jwt(user)
        return jsonify({"token": token, "user": {"id": user.id, "username": user.username, "email": user.email}})
    finally:
        db.close()


@app.route("/me", methods=["GET"])
def me():
    user = _auth_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    return jsonify({"id": user.id, "username": user.username, "email": user.email})


@app.route("/me/goals", methods=["GET", "PUT"])
def me_goals():
    user = _auth_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    db = next(get_db())
    try:
        if request.method == "GET":
            goals = (user.prefs or {}).get("goals", {})
            return jsonify({"goals": goals})
        else:
            data = request.get_json() or {}
            goals = data.get("goals") or {}
            if not isinstance(goals, dict):
                return jsonify({"error": "goals must be an object"}), 400
            prefs = user.prefs or {}
            prefs["goals"] = goals
            user.prefs = prefs
            db.add(user)
            db.commit()
            return jsonify({"success": True, "goals": goals})
    finally:
        db.close()

@app.route("/summary/day")
def day_summary_endpoint():
    """Direct day summary without the agent. Params: user_id (int), date (optional ISO or 'today'/'yesterday')."""
    try:
        user_id = request.args.get("user_id", type=int)
        date_str = request.args.get("date")
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400
        data = tool_compute_day(user_id=user_id, date_iso=(None if date_str in (None, "today", "now") else (datetime.utcnow().date().isoformat() if date_str == "utc_today" else date_str)))
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/agent", methods=["POST"])
def agent_endpoint():
    """Main agent endpoint that accepts user messages"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Validate request
        agent_request = AgentRequest(**data)
        
        # Bypass system for better performance
        message = agent_request.message.lower()
        
        # Handle logging requests
        if "log meal:" in message or "log" in message:
            try:
                import re
                from app.models import MealLog
                
                # Parse log message: "log meal: 150g food_id=1 meal_type=breakfast" (supports negative IDs for USDA foods)
                grams_match = re.search(r'(\d+(?:\.\d+)?)g', message)
                food_id_match = re.search(r'food_id=(-?\d+)', message)  # Support negative IDs
                meal_type_match = re.search(r'meal_type=(\w+)', message)
                
                if grams_match and food_id_match:
                    grams = float(grams_match.group(1))
                    food_id = int(food_id_match.group(1))
                    meal_type = meal_type_match.group(1) if meal_type_match else 'snack'
                    
                    db = next(get_db())
                    
                    # Handle USDA foods (negative IDs) by creating/finding local entries
                    if food_id < 0:
                        # This is a USDA food - create or find local database entry
                        from app.usda_food_manager import usda_food_manager
                        
                        local_food = usda_food_manager.fetch_and_store_usda_food(db, food_id)
                        if not local_food:
                            return jsonify({
                                "ok": False,
                                "error": "Could not retrieve USDA food details for logging",
                                "message": "USDA food not available"
                            })
                        
                        # Use the local food ID for logging
                        actual_food_id = local_food.id
                    else:
                        # Local database food
                        actual_food_id = food_id
                    
                    # Create meal log entry (works for both local and USDA foods now)
                    meal_log = MealLog(
                        user_id=agent_request.user_id,
                        food_id=actual_food_id,
                        grams=grams,
                        meal_type=meal_type
                    )
                    db.add(meal_log)
                    db.commit()
                    db.refresh(meal_log)
                    
                    # Get food info for response
                    from app.models import Food
                    food = db.query(Food).filter(Food.id == actual_food_id).first()
                    if food:
                        # Calculate nutrition for the logged amount
                        multiplier = grams / 100.0
                        logged_calories = (food.calories or 0) * multiplier
                        
                        # Add source info to message
                        source_info = ""
                        if food.data_source == 'usda':
                            source_info = " (USDA)"
                        
                        return jsonify({
                            "ok": True,
                            "intent": "log_meal",
                            "message": f"Logged {grams}g of {food.name}{source_info} ({logged_calories:.0f} calories)",
                            "confidence": 1.0,
                            "needs_clarification": False,
                            "questions": [],
                            "candidates": [],
                            "selected": None,
                            "log_result": {
                                "id": meal_log.id,
                                "food_name": food.name,
                                "grams": grams,
                                "meal_type": meal_type,
                                "calories": logged_calories,
                                "source": food.data_source
                            },
                            "day_summary": None,
                            "recommendations": [],
                            "state": {"intent": "log_meal", "logged": True}
                        })
                    
            except Exception as e:
                return jsonify({"error": f"Failed to log meal: {str(e)}"}), 500
        
        # Handle search requests with USDA API integration
        elif "search" in message:
            # Support mode override via message: "search generic <term>" or "search branded <term>"
            msg_lower = message.lower().strip()
            mode_override = None
            if msg_lower.startswith("search generic "):
                search_term = message[len("search generic "):].strip()
                mode_override = "generic"
            elif msg_lower.startswith("search branded "):
                search_term = message[len("search branded "):].strip()
                mode_override = "branded"
            else:
                search_term = message.replace("search", "").strip()

            # Optional pagination hints: page=2 size=25 in the message
            import re as _re
            m_page = _re.search(r"page=(\d+)", msg_lower)
            m_size = _re.search(r"size=(\d+)", msg_lower)
            page = int(m_page.group(1)) if m_page else 1
            size = int(m_size.group(1)) if m_size else 25
            page = max(1, page)
            size = max(1, min(100, size))
            # Remove pagination tokens from the actual search term
            clean_term = _re.sub(r"\b(page=\d+|size=\d+)\b", "", search_term, flags=_re.I)
            clean_term = _re.sub(r"\s+", " ", clean_term).strip()
            search_term = clean_term
            # Lowercase search matcher
            search_lower = search_term.lower()
            if search_term:
                # Cache key combines cleaned term, mode, page/size
                cache_key = f"{search_term.lower()}|{mode_override or 'auto'}|{page}|{size}"
                cached = SEARCH_CACHE.get(cache_key)
                now = time.time()
                if cached and now - cached.get('ts', 0) < SEARCH_CACHE_TTL:
                    payload = cached['payload']
                    return jsonify(payload)
                # First try local database for speed
                from app.models import Food
                db = next(get_db())
                local_foods = db.query(Food).filter(Food.name.ilike(f"%{search_term}%")).limit(10).all()
                
                local_candidates = []
                for food in local_foods:
                    local_candidates.append({
                        "id": food.id,
                        "name": food.name,
                        "brand": food.brand,
                        "calories": food.calories,
                        "protein_g": food.protein_g,
                        "fat_g": food.fat_g,
                        "carbs_g": food.carbs_g,
                        "vitamin_a_rae": food.vitamin_a_rae,
                        "vitamin_c_mg": food.vitamin_c_mg,
                        "vitamin_d_iu": food.vitamin_d_iu,
                        "vitamin_e_mg": food.vitamin_e_mg,
                        "vitamin_k_mcg": food.vitamin_k_mcg,
                        "calcium_mg": food.calcium_mg,
                        "iron_mg": food.iron_mg,
                        "magnesium_mg": food.magnesium_mg,
                        "zinc_mg": food.zinc_mg,
                        "potassium_mg": food.potassium_mg,
                        "sodium_mg": food.sodium_mg,
                        "source": "local"
                    })
                
                # Then search USDA API for comprehensive results
                try:
                    from app.food_api import usda_api
                    try:
                        from app.food_sources.nutritionix_loader import available as nx_available, search_nx_foods
                    except Exception:
                        nx_available = lambda: False
                        search_nx_foods = lambda q, limit=25: []
                    # search_lower already computed after cleaning

                    # Heuristic: prefer generic base items for staple queries like 'milk', 'eggs', 'rice', etc.
                    GENERIC_FIRST_TERMS = {
                        # staples
                        'milk', 'eggs', 'egg', 'yogurt', 'cheese', 'butter', 'rice', 'oats', 'oat', 'oatmeal',
                        # fruits
                        'banana', 'apple', 'orange', 'grape', 'strawberry', 'blueberry', 'raspberry', 'blackberry',
                        'kiwi', 'pear', 'peach', 'plum', 'mango', 'pineapple', 'watermelon', 'cantaloupe', 'lemon',
                        'lime', 'cherry',
                        'pomegranate',
                        # vegetables
                        'broccoli', 'spinach', 'carrot', 'kale', 'cabbage', 'lettuce', 'cucumber', 'tomato',
                        'pepper', 'onion', 'garlic', 'potato', 'sweet potato', 'zucchini', 'cauliflower', 'celery',
                        # nuts/seeds
                        'almond', 'walnut', 'cashew', 'peanut', 'pistachio', 'pecan', 'hazelnut', 'chia', 'flaxseed',
                        'pumpkin seed', 'sunflower seed',
                        # proteins
                        'chicken', 'beef', 'pork', 'turkey', 'salmon', 'tuna'
                    }
                    prefer_generic = (
                        (mode_override == "generic") or
                        (mode_override is None and (search_lower in GENERIC_FIRST_TERMS or search_lower.endswith(' milk') or search_lower == 'milk'))
                    )

                    candidates: list = []

                    processed_terms = ['snack', 'ramen', 'ramyun', 'noodles', 'cereal', 'bar', 'sauce', 'soup', 'lasagna', 'dumpling', 'bowl', 'frozen', 'juice', 'canned', 'drink', 'beverage', 'smoothie', 'nectar']

                    def score_generic(food: dict) -> int:
                        name = (food.get('name') or '').lower()
                        brand = (food.get('brand') or '').lower()
                        s = 0
                        if search_lower == name:
                            s += 600
                        if name.startswith(search_lower):
                            s += 300
                        if search_lower in name:
                            s += 400
                        # Prefer raw/fresh/plain
                        if any(t in name for t in [' raw', 'fresh', '(raw)']):
                            s += 200
                        # Penalize roasted/salted/flavored/sweetened forms for nuts/fruits when user asked the base term
                        if any(t in name for t in ['roasted', 'salted', 'honey', 'chocolate', 'flavored', 'sweetened']):
                            s -= 180
                        # Shorter, simpler names preferred
                        s += max(0, 150 - 20 * (len(name.split())))
                        if any(p in name for p in processed_terms):
                            s -= 200
                        # tiny bonus if brand contains the term (e.g., store brand milk)
                        if search_lower in brand:
                            s += 50
                        return s

                    def score_branded(food: dict) -> int:
                        name = (food.get('name') or '').lower()
                        brand = (food.get('brand') or '').lower()
                        upc = (food.get('upc') or '').strip()
                        s = 0
                        if search_lower in name or search_lower in brand:
                            s += 300
                        if name.startswith(search_lower):
                            s += 200
                        if upc:
                            s += 200
                        if any(p in name for p in processed_terms):
                            s -= 100
                        return s

                    if prefer_generic:
                        # Pull a wide set of explicit non-branded data types
                        generic_items: list = []
                        for dtype in ('SR Legacy', 'Foundation', 'Survey (FNDDS)'):
                            res = usda_api.search_foods(search_term, page_size=50, data_type=dtype)
                            for usda_food in res.get('foods', []):
                                if usda_food.get('dataType') == 'Branded':
                                    continue
                                nf = usda_api.normalize_food_data(usda_food)
                                nf['source'] = 'usda'
                                nf['id'] = -abs(nf['id'])
                                generic_items.append(nf)

                        # Keep only items that actually match the search term
                        generic_items = [
                            f for f in generic_items
                            if search_lower in (f.get('name') or '').lower() or search_lower in (f.get('brand') or '').lower()
                        ]
                        # Stricter base-food filter: avoid mixed dishes/recipes when user asks for a staple
                        base_excludes = [' and ', ' with ', ' including ', 'incl.', ' mix', ' salad', ' sauce', ' soup', ' stew', ' stir-fry', ' casserole']
                        def is_base_food(name: str) -> bool:
                            n = name.lower()
                            if any(x in n for x in base_excludes):
                                return False
                            # Allow preparation qualifiers only
                            allowed = [' raw', ' fresh', ' cooked', ' boiled', ' steamed', ' baked', ' roasted', ' grilled', ' regular', ' firm', ' extra firm', ' super firm']
                            # If the term is at the start or followed by a comma/space, consider base
                            if n.startswith(search_lower) or f", {search_lower}" in n:
                                return True
                            # If there are disallowed punctuation indicating composite titles
                            if ',' in n and search_lower not in n.split(',')[0]:
                                return False
                            # Otherwise allow only if none of the disallowed connectors exist
                            return True
                        # Tofu-specific hard filter: drop entries that mention other primary proteins
                        protein_words = ['fish', 'pork', 'beef', 'chicken', 'turkey', 'shrimp']
                        if search_lower == 'tofu':
                            generic_items = [f for f in generic_items if not any(w in (f.get('name') or '').lower() for w in protein_words)]
                        generic_items = [f for f in generic_items if is_base_food(f.get('name') or '')]
                        generic_items.sort(key=score_generic, reverse=True)

                        # Optionally add a few clean branded staples (e.g., plain milk cartons)
                        branded_results = usda_api.search_foods(search_term, page_size=50, data_type='Branded')
                        branded_items: list = []
                        for usda_food in branded_results.get('foods', []):
                            nf = usda_api.normalize_food_data(usda_food)
                            nf['source'] = 'usda'
                            nf['id'] = -abs(nf['id'])
                            branded_items.append(nf)
                        if nx_available():
                            try:
                                nx = search_nx_foods(search_term, limit=25)
                                branded_items.extend(nx)
                            except Exception:
                                pass
                        branded_items.sort(key=lambda f: (score_branded(f) + int(f.get('__score_boost', 0))), reverse=True)

                        candidates = local_candidates + generic_items[:25]
                        if len(candidates) - len(local_candidates) < 15:
                            # Top up with branded if generic list is small
                            take = 25 - (len(candidates) - len(local_candidates))
                            candidates += branded_items[:take]
                        search_type = 'generic_first'
                        meta_counts = {"generic_count": len(generic_items)}
                    else:
                        # Default: branded first (for queries like tofu)
                        branded_results = usda_api.search_foods(search_term, page_size=50, data_type='Branded')
                        branded_items: list = []
                        for usda_food in branded_results.get('foods', []):
                            nf = usda_api.normalize_food_data(usda_food)
                            nf['source'] = 'usda'
                            nf['id'] = -abs(nf['id'])
                            branded_items.append(nf)
                        if nx_available():
                            try:
                                nx = search_nx_foods(search_term, limit=25)
                                branded_items.extend(nx)
                            except Exception:
                                pass

                        # For very specific single-word staples (e.g., 'tofu') require the word to appear in the product name
                        import re
                        tokens = re.findall(r"[a-z0-9]+", search_lower)
                        CORE_NAME_REQUIRED = {"tofu"}
                        if len(tokens) == 1 and tokens[0] in CORE_NAME_REQUIRED:
                            word = tokens[0]
                            branded_items = [f for f in branded_items if re.search(rf"\b{re.escape(word)}\b", (f.get('name') or '').lower())]

                        # Strongly de-prioritize clearly unrelated prepared/processed items
                        hard_exclude_terms = [
                            'cheese', 'frosting', 'ramen', 'ramyun', 'noodle', 'noodles', 'sauce', 'lasagna',
                            'scramble', 'soup', 'bowl', 'dumpling', 'veggies', 'snack', 'bar', 'cereal'
                        ]
                        branded_items = [
                            f for f in branded_items
                            if not any(t in (f.get('name') or '').lower() for t in hard_exclude_terms)
                        ]

                        # Tofu-specific prioritization (firm/extra-firm/silken/plain blocks)
                        tofu_priority_terms = [
                            'extra firm', 'super firm', 'firm', 'silken', 'soft', 'medium', 'sprouted',
                            'organic', 'plain', 'original', 'block', 'cutlet', 'cubed', 'baked', 'smoked'
                        ]
                        def tofu_name_boost(name: str) -> int:
                            n = name.lower()
                            boost = 0
                            for i, term in enumerate(tofu_priority_terms):
                                if term in n:
                                    # earlier terms get a little more boost
                                    boost += 200 - i * 8
                            # prefer names that start with 'tofu' or contain 'tofu' early
                            if n.startswith('tofu') or ' tofu' in n[:10]:
                                boost += 120
                            return boost

                        for f in branded_items:
                            name = (f.get('name') or '')
                            f['__score_boost'] = tofu_name_boost(name)
                        branded_items.sort(key=score_branded, reverse=True)

                        # Supplement with generic if needed
                        supplemental_results = usda_api.search_foods(search_term, page_size=50)
                        supplemental_items: list = []
                        for usda_food in supplemental_results.get('foods', []):
                            nf = usda_api.normalize_food_data(usda_food)
                            nf['source'] = 'usda'
                            nf['id'] = -abs(nf['id'])
                            supplemental_items.append(nf)
                        # Strict filter: only items that contain the term in name or brand
                        supplemental_items = [
                            f for f in supplemental_items
                            if search_lower in (f.get('name') or '').lower() or search_lower in (f.get('brand') or '').lower()
                        ]
                        if search_lower == 'tofu':
                            supplemental_items = [f for f in supplemental_items if not any(w in (f.get('name') or '').lower() for w in protein_words)]
                        supplemental_items = [f for f in supplemental_items if is_base_food(f.get('name') or '')]
                        supplemental_items.sort(key=lambda f: (score_branded(f) + int(f.get('__score_boost', 0))), reverse=True)

                        candidates = local_candidates + branded_items[:25]
                        if len(candidates) - len(local_candidates) < 15:
                            take = 25 - (len(candidates) - len(local_candidates))
                            candidates += supplemental_items[:take]
                        search_type = 'branded_first'
                        meta_counts = {"usda_branded_count": len(branded_items)}

                    # Apply pagination
                    total = len(candidates)
                    start = (page - 1) * size
                    end = start + size
                    sliced = candidates[start:end]
                    payload = {
                        "ok": True,
                        "intent": "search_food",
                        "message": f"Search '{search_term}' ({search_type}) returned {total} items",
                        "confidence": 1.0,
                        "needs_clarification": False,
                        "questions": [],
                        "candidates": sliced,
                        "selected": None,
                        "log_result": None,
                        "day_summary": None,
                        "recommendations": [],
                        "state": {"intent": "search_food", "food_candidates": sliced},
                        "search_type": search_type,
                        "local_count": len(local_candidates),
                        **meta_counts,
                        "pagination": {
                            "page": page,
                            "page_size": size,
                            "total": total,
                            "has_next": end < total,
                            "next_page": page + 1 if end < total else None,
                        }
                    }
                    # Save in cache
                    SEARCH_CACHE[cache_key] = {"ts": now, "payload": payload}
                    return jsonify(payload)
                    
                except Exception as usda_error:
                    print(f"USDA API error: {usda_error}")
                    # Fall back to local results only
                    return jsonify({
                        "ok": True,
                        "intent": "search_food",
                        "message": f"Found {len(local_candidates)} foods matching '{search_term}' (local only - USDA API unavailable)",
                        "confidence": 1.0,
                        "needs_clarification": False,
                        "questions": [],
                        "candidates": local_candidates,
                        "selected": None,
                        "log_result": None,
                        "day_summary": None,
                        "recommendations": [],
                        "state": {"intent": "search_food", "food_candidates": local_candidates},
                        "search_type": "local_only",
                        "error": "USDA API temporarily unavailable"
                    })
        
        # Run agent workflow
        result = run_agent(agent_request.user_id, agent_request.message)

        # Build structured response sections
        intent = result.get("intent")
        response_text = result.get("response", "")
        candidates = result.get("food_candidates") or []
        selected = result.get("selected_food")
        log_result = result.get("log_entry")
        day_data = result.get("day_data")
        recommendations = result.get("recommendations") if isinstance(result.get("recommendations"), list) else []

        # Coerce lists to schema types where possible
        def to_candidate(x):
            try:
                return FoodCandidate(**x)
            except Exception:
                return None
        cand_models = [c for c in (to_candidate(x) for x in candidates) if c]
        selected_model = to_candidate(selected) if isinstance(selected, dict) else None

        log_model = None
        if isinstance(log_result, dict):
            try:
                log_model = MealLogSchema(**log_result)
            except Exception:
                log_model = None

        day_model = None
        if isinstance(day_data, dict):
            try:
                day_model = DaySummary(**day_data)
            except Exception:
                day_model = None

        rec_models = []
        for rec in recommendations:
            try:
                rec_models.append(RecommendationItem(**rec))
            except Exception:
                continue

        payload = AgentStructuredResponse(
            ok=True,
            intent=intent,
            message=response_text,
            confidence=float(result.get("confidence", 0.0)),
            needs_clarification=bool(result.get("needs_clarification", False)),
            questions=list(result.get("questions", [])),
            candidates=cand_models,
            selected=selected_model,
            log_result=log_model,
            day_summary=day_model,
            recommendations=rec_models,
            state=result,
        )
        
        return jsonify(payload.dict())
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/barcode/lookup")
def barcode_lookup():
    """Lookup food by UPC code"""
    try:
        upc = request.args.get("upc")
        if not upc:
            return jsonify({"error": "UPC parameter required"}), 400
        
        # Get database session
        db = next(get_db())
        
        # Lookup UPC
        foods = lookup_upc(db, upc)
        
        if foods:
            return jsonify({
                "found": True,
                "foods": [
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
            })
        else:
            return jsonify({
                "found": False,
                "message": f"No food found with UPC {upc}"
            })
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/users/<int:user_id>/goals", methods=["GET"])
def get_user_goals(user_id):
    """Get user's nutrition goals"""
    try:
        db = next(get_db())
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        goals = user.prefs.get("goals", {}) if user.prefs else {}
        return jsonify({"goals": goals})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/users/<int:user_id>/goals", methods=["PUT"])
def set_user_goals(user_id):
    """Set user's nutrition goals"""
    try:
        data = request.get_json()
        if not data or "goals" not in data:
            return jsonify({"error": "Goals data required"}), 400
        
        db = next(get_db())
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if not user.prefs:
            user.prefs = {}
        
        user.prefs["goals"] = data["goals"]
        db.commit()
        
        return jsonify({"success": True, "goals": data["goals"]})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/profile/<int:user_id>", methods=["GET"])
def get_user_profile(user_id: int):
    """Get user's profile and nutrition goals"""
    try:
        db = next(get_db())
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "profile": {
                "age": user.age,
                "weight_kg": user.weight_kg,
                "height_cm": user.height_cm,
                "gender": user.gender,
                "activity_level": user.activity_level,
                "goal_type": user.goal_type
            },
            "goals": {
                "calories": user.goal_calories,
                "protein_g": user.goal_protein_g,
                "fat_g": user.goal_fat_g,
                "carbs_g": user.goal_carbs_g,
                "fiber_g": user.goal_fiber_g,
                "sodium_mg": user.goal_sodium_mg,
                "vitamin_c_mg": user.goal_vitamin_c_mg,
                "calcium_mg": user.goal_calcium_mg,
                "iron_mg": user.goal_iron_mg,
                "potassium_mg": user.goal_potassium_mg
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/profile/<int:user_id>", methods=["POST"])
def update_user_profile(user_id: int):
    """Update user's profile and calculate nutrition goals"""
    try:
        db = next(get_db())
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json()
        
        # Update profile fields
        if 'profile' in data:
            profile = data['profile']
            if 'age' in profile:
                user.age = profile['age']
            if 'weight_kg' in profile:
                user.weight_kg = profile['weight_kg']
            if 'height_cm' in profile:
                user.height_cm = profile['height_cm']
            if 'gender' in profile:
                user.gender = profile['gender']
            if 'activity_level' in profile:
                user.activity_level = profile['activity_level']
            if 'goal_type' in profile:
                user.goal_type = profile['goal_type']
        
        # Update custom goals if provided
        if 'goals' in data:
            goals = data['goals']
            if 'calories' in goals:
                user.goal_calories = goals['calories']
            if 'protein_g' in goals:
                user.goal_protein_g = goals['protein_g']
            if 'fat_g' in goals:
                user.goal_fat_g = goals['fat_g']
            if 'carbs_g' in goals:
                user.goal_carbs_g = goals['carbs_g']
        
        # Auto-calculate goals based on profile
        from app.nutrition_goals import goal_calculator
        user = goal_calculator.update_user_goals(user)
        
        db.commit()
        db.refresh(user)
        
        return jsonify({
            "message": "Profile updated successfully",
            "calculated_goals": {
                "calories": user.goal_calories,
                "protein_g": user.goal_protein_g,
                "fat_g": user.goal_fat_g,
                "carbs_g": user.goal_carbs_g
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/meal-plan/<int:user_id>", methods=["POST"])
def generate_meal_plan(user_id: int):
    """Generate a meal plan for the user"""
    try:
        from app.meal_planner import meal_planner
        from app.models import User
        
        db = next(get_db())
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Generate meal plan
        meal_plan = meal_planner.suggest_meal_plan(db, user)
        
        # Get nutrition totals
        nutrition = meal_planner.get_meal_plan_nutrition(db, meal_plan)
        
        # Format response
        meals_by_type = {}
        for item in meal_plan.items:
            if item.meal_type not in meals_by_type:
                meals_by_type[item.meal_type] = []
            
            meals_by_type[item.meal_type].append({
                "food_name": item.food.name,
                "brand": item.food.brand,
                "grams": item.grams,
                "calories": (item.food.calories or 0) * item.grams / 100,
                "protein_g": (item.food.protein_g or 0) * item.grams / 100,
                "notes": item.notes
            })
        
        return jsonify({
            "meal_plan_id": meal_plan.id,
            "name": meal_plan.name,
            "description": meal_plan.description,
            "target_date": meal_plan.target_date.isoformat(),
            "targets": {
                "calories": meal_plan.target_calories,
                "protein_g": meal_plan.target_protein_g,
                "fat_g": meal_plan.target_fat_g,
                "carbs_g": meal_plan.target_carbs_g
            },
            "actual_nutrition": nutrition,
            "meals": meals_by_type
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/export/<int:user_id>", methods=["GET"])
def export_data(user_id: int):
    """Export user's nutrition data as CSV"""
    try:
        import csv
        import io
        from flask import make_response
        
        db = next(get_db())
        
        # Get recent meal logs
        from app.models import MealLog
        from sqlalchemy.orm import joinedload
        from datetime import datetime, timedelta
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)  # Last 30 days
        
        meal_logs = db.query(MealLog).options(joinedload(MealLog.food)).filter(
            MealLog.user_id == user_id,
            MealLog.logged_at >= start_date
        ).order_by(MealLog.logged_at.desc()).all()
        
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Date', 'Meal Type', 'Food Name', 'Brand', 'Grams', 
            'Calories', 'Protein (g)', 'Fat (g)', 'Carbs (g)',
            'Vitamin C (mg)', 'Calcium (mg)', 'Iron (mg)'
        ])
        
        # Write data
        for log in meal_logs:
            food = log.food
            multiplier = log.grams / 100.0
            
            writer.writerow([
                log.logged_at.strftime('%Y-%m-%d'),
                log.meal_type,
                food.name,
                food.brand or 'Generic',
                log.grams,
                round((food.calories or 0) * multiplier, 1),
                round((food.protein_g or 0) * multiplier, 1),
                round((food.fat_g or 0) * multiplier, 1),
                round((food.carbs_g or 0) * multiplier, 1),
                round((food.vitamin_c_mg or 0) * multiplier, 1),
                round((food.calcium_mg or 0) * multiplier, 1),
                round((food.iron_mg or 0) * multiplier, 1)
            ])
        
        # Create response
        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename=nutrition_data_{user_id}_{datetime.now().strftime("%Y%m%d")}.csv'
        
        return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/progress/<int:user_id>", methods=["GET"])
def get_progress_data(user_id: int):
    """Get progress data for charts and analytics"""
    try:
        from datetime import datetime, timedelta
        from sqlalchemy.orm import joinedload
        from sqlalchemy import func
        
        db = next(get_db())
        
        # Get date range (default to last 30 days)
        days = int(request.args.get('days', 30))
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get user's goals
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get daily nutrition totals for the period
        from app.models import MealLog
        
        daily_data = []
        current_date = start_date
        
        while current_date <= end_date:
            # Get all meal logs for this day
            day_start = current_date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            day_logs = db.query(MealLog).options(joinedload(MealLog.food)).filter(
                MealLog.user_id == user_id,
                MealLog.logged_at >= day_start,
                MealLog.logged_at < day_end
            ).all()
            
            # Calculate daily totals
            daily_totals = {
                'date': current_date.strftime('%Y-%m-%d'),
                'calories': 0,
                'protein_g': 0,
                'fat_g': 0,
                'carbs_g': 0,
                'vitamin_c_mg': 0,
                'calcium_mg': 0,
                'iron_mg': 0,
                'meals_logged': len(day_logs)
            }
            
            for log in day_logs:
                food = log.food
                multiplier = log.grams / 100.0
                
                daily_totals['calories'] += (food.calories or 0) * multiplier
                daily_totals['protein_g'] += (food.protein_g or 0) * multiplier
                daily_totals['fat_g'] += (food.fat_g or 0) * multiplier
                daily_totals['carbs_g'] += (food.carbs_g or 0) * multiplier
                daily_totals['vitamin_c_mg'] += (food.vitamin_c_mg or 0) * multiplier
                daily_totals['calcium_mg'] += (food.calcium_mg or 0) * multiplier
                daily_totals['iron_mg'] += (food.iron_mg or 0) * multiplier
            
            # Calculate goal achievement percentages
            if user.goal_calories:
                daily_totals['calorie_goal_percent'] = (daily_totals['calories'] / user.goal_calories) * 100
            if user.goal_protein_g:
                daily_totals['protein_goal_percent'] = (daily_totals['protein_g'] / user.goal_protein_g) * 100
            if user.goal_fat_g:
                daily_totals['fat_goal_percent'] = (daily_totals['fat_g'] / user.goal_fat_g) * 100
            if user.goal_carbs_g:
                daily_totals['carbs_goal_percent'] = (daily_totals['carbs_g'] / user.goal_carbs_g) * 100
            
            daily_data.append(daily_totals)
            current_date += timedelta(days=1)
        
        # Calculate summary statistics
        total_days = len([d for d in daily_data if d['meals_logged'] > 0])
        
        if total_days > 0:
            avg_calories = sum(d['calories'] for d in daily_data) / total_days
            avg_protein = sum(d['protein_g'] for d in daily_data) / total_days
            avg_fat = sum(d['fat_g'] for d in daily_data) / total_days
            avg_carbs = sum(d['carbs_g'] for d in daily_data) / total_days
            
            # Goal achievement stats
            calorie_goal_days = len([d for d in daily_data if d.get('calorie_goal_percent', 0) >= 90])
            protein_goal_days = len([d for d in daily_data if d.get('protein_goal_percent', 0) >= 90])
            
            streak = 0  # Current streak of days with logged meals
            for day in reversed(daily_data):
                if day['meals_logged'] > 0:
                    streak += 1
                else:
                    break
        else:
            avg_calories = avg_protein = avg_fat = avg_carbs = 0
            calorie_goal_days = protein_goal_days = streak = 0
        
        return jsonify({
            "daily_data": daily_data,
            "summary": {
                "total_days_logged": total_days,
                "avg_calories": round(avg_calories, 1),
                "avg_protein_g": round(avg_protein, 1),
                "avg_fat_g": round(avg_fat, 1),
                "avg_carbs_g": round(avg_carbs, 1),
                "calorie_goal_achievement_days": calorie_goal_days,
                "protein_goal_achievement_days": protein_goal_days,
                "current_streak": streak
            },
            "goals": {
                "calories": user.goal_calories,
                "protein_g": user.goal_protein_g,
                "fat_g": user.goal_fat_g,
                "carbs_g": user.goal_carbs_g
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/meal-templates/<int:user_id>", methods=["GET"])
def get_meal_templates(user_id: int):
    """Get all meal plan templates for a user"""
    try:
        from app.models import MealPlan
        from sqlalchemy.orm import joinedload
        
        db = next(get_db())
        
        templates = db.query(MealPlan).options(
            joinedload(MealPlan.items).joinedload('food')
        ).filter(
            MealPlan.user_id == user_id,
            MealPlan.is_template == 1
        ).order_by(MealPlan.created_at.desc()).all()
        
        template_list = []
        for template in templates:
            # Calculate nutrition totals
            total_nutrition = {
                'calories': 0, 'protein_g': 0, 'fat_g': 0, 'carbs_g': 0
            }
            
            meals_by_type = {}
            for item in template.items:
                if item.meal_type not in meals_by_type:
                    meals_by_type[item.meal_type] = []
                
                multiplier = item.grams / 100.0
                item_nutrition = {
                    'calories': (item.food.calories or 0) * multiplier,
                    'protein_g': (item.food.protein_g or 0) * multiplier,
                    'fat_g': (item.food.fat_g or 0) * multiplier,
                    'carbs_g': (item.food.carbs_g or 0) * multiplier
                }
                
                # Add to totals
                for key in total_nutrition:
                    total_nutrition[key] += item_nutrition[key]
                
                meals_by_type[item.meal_type].append({
                    'food_name': item.food.name,
                    'brand': item.food.brand,
                    'grams': item.grams,
                    'nutrition': item_nutrition
                })
            
            template_list.append({
                'id': template.id,
                'name': template.name,
                'description': template.description,
                'total_nutrition': {k: round(v, 1) for k, v in total_nutrition.items()},
                'meals': meals_by_type,
                'created_at': template.created_at.isoformat()
            })
        
        return jsonify({"templates": template_list})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/meal-templates/<int:user_id>", methods=["POST"])
def save_meal_template(user_id: int):
    """Save a meal plan as a template"""
    try:
        from app.models import MealPlan, MealPlanItem
        
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({"error": "Template name required"}), 400
        
        db = next(get_db())
        
        # Create template
        template = MealPlan(
            user_id=user_id,
            name=data['name'],
            description=data.get('description', ''),
            is_template=1,
            target_calories=data.get('target_calories'),
            target_protein_g=data.get('target_protein_g'),
            target_fat_g=data.get('target_fat_g'),
            target_carbs_g=data.get('target_carbs_g')
        )
        db.add(template)
        db.commit()
        db.refresh(template)
        
        # Add template items
        for meal_type, items in data.get('meals', {}).items():
            for idx, item in enumerate(items):
                template_item = MealPlanItem(
                    meal_plan_id=template.id,
                    food_id=item['food_id'],
                    meal_type=meal_type,
                    grams=item['grams'],
                    order_index=idx,
                    notes=item.get('notes', '')
                )
                db.add(template_item)
        
        db.commit()
        
        return jsonify({
            "message": "Template saved successfully",
            "template_id": template.id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/meal-templates/<int:template_id>/apply/<int:user_id>", methods=["POST"])
def apply_meal_template(template_id: int, user_id: int):
    """Apply a template to create a new meal plan"""
    try:
        from app.models import MealPlan, MealPlanItem
        from datetime import datetime, timedelta
        
        data = request.get_json()
        target_date_str = data.get('target_date')
        
        if target_date_str:
            target_date = datetime.fromisoformat(target_date_str.replace('Z', '+00:00'))
        else:
            target_date = datetime.now() + timedelta(days=1)
        
        db = next(get_db())
        
        # Get template
        template = db.query(MealPlan).filter(
            MealPlan.id == template_id,
            MealPlan.user_id == user_id,
            MealPlan.is_template == 1
        ).first()
        
        if not template:
            return jsonify({"error": "Template not found"}), 404
        
        # Create new meal plan from template
        new_plan = MealPlan(
            user_id=user_id,
            name=f"{template.name} - {target_date.strftime('%B %d')}",
            description=f"Applied from template: {template.name}",
            target_date=target_date,
            is_template=0,
            target_calories=template.target_calories,
            target_protein_g=template.target_protein_g,
            target_fat_g=template.target_fat_g,
            target_carbs_g=template.target_carbs_g
        )
        db.add(new_plan)
        db.commit()
        db.refresh(new_plan)
        
        # Copy template items to new plan
        for template_item in template.items:
            new_item = MealPlanItem(
                meal_plan_id=new_plan.id,
                food_id=template_item.food_id,
                meal_type=template_item.meal_type,
                grams=template_item.grams,
                order_index=template_item.order_index,
                notes=template_item.notes
            )
            db.add(new_item)
        
        db.commit()
        
        return jsonify({
            "message": "Template applied successfully",
            "meal_plan_id": new_plan.id,
            "target_date": target_date.isoformat()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/meal-templates/<int:template_id>/<int:user_id>", methods=["DELETE"])
def delete_meal_template(template_id: int, user_id: int):
    """Delete a meal template"""
    try:
        from app.models import MealPlan
        
        db = next(get_db())
        
        template = db.query(MealPlan).filter(
            MealPlan.id == template_id,
            MealPlan.user_id == user_id,
            MealPlan.is_template == 1
        ).first()
        
        if not template:
            return jsonify({"error": "Template not found"}), 404
        
        db.delete(template)
        db.commit()
        
        return jsonify({"message": "Template deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/recipes/<int:user_id>", methods=["GET"])
def get_user_recipes(user_id: int):
    """Get all recipes for a user"""
    try:
        from app.models import Recipe
        from sqlalchemy.orm import joinedload
        
        db = next(get_db())
        
        recipes = db.query(Recipe).options(
            joinedload(Recipe.ingredients).joinedload('food')
        ).filter(Recipe.user_id == user_id).order_by(Recipe.created_at.desc()).all()
        
        recipe_list = []
        for recipe in recipes:
            recipe_data = {
                'id': recipe.id,
                'name': recipe.name,
                'description': recipe.description,
                'servings': recipe.servings,
                'prep_time_minutes': recipe.prep_time_minutes,
                'cook_time_minutes': recipe.cook_time_minutes,
                'instructions': recipe.instructions,
                'nutrition_per_serving': {
                    'calories': recipe.calories_per_serving,
                    'protein_g': recipe.protein_g_per_serving,
                    'fat_g': recipe.fat_g_per_serving,
                    'carbs_g': recipe.carbs_g_per_serving,
                    'vitamin_c_mg': recipe.vitamin_c_mg_per_serving,
                    'calcium_mg': recipe.calcium_mg_per_serving,
                    'iron_mg': recipe.iron_mg_per_serving
                },
                'ingredients': [
                    {
                        'food_name': ing.food.name,
                        'brand': ing.food.brand,
                        'grams': ing.grams,
                        'notes': ing.notes,
                        'food_id': ing.food_id
                    }
                    for ing in sorted(recipe.ingredients, key=lambda x: x.order_index)
                ],
                'created_at': recipe.created_at.isoformat()
            }
            recipe_list.append(recipe_data)
        
        return jsonify({"recipes": recipe_list})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/recipes/<int:user_id>", methods=["POST"])
def create_recipe(user_id: int):
    """Create a new recipe"""
    try:
        from app.models import Recipe, RecipeIngredient, Food
        
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({"error": "Recipe name required"}), 400
        
        db = next(get_db())
        
        # Create recipe
        recipe = Recipe(
            user_id=user_id,
            name=data['name'],
            description=data.get('description', ''),
            servings=data.get('servings', 1.0),
            prep_time_minutes=data.get('prep_time_minutes'),
            cook_time_minutes=data.get('cook_time_minutes'),
            instructions=data.get('instructions', '')
        )
        db.add(recipe)
        db.commit()
        db.refresh(recipe)
        
        # Add ingredients and calculate nutrition
        total_nutrition = {
            'calories': 0, 'protein_g': 0, 'fat_g': 0, 'carbs_g': 0,
            'vitamin_c_mg': 0, 'calcium_mg': 0, 'iron_mg': 0
        }
        
        for idx, ingredient_data in enumerate(data.get('ingredients', [])):
            ingredient = RecipeIngredient(
                recipe_id=recipe.id,
                food_id=ingredient_data['food_id'],
                grams=ingredient_data['grams'],
                notes=ingredient_data.get('notes', ''),
                order_index=idx
            )
            db.add(ingredient)
            
            # Get food nutrition and add to totals
            food = db.query(Food).filter(Food.id == ingredient_data['food_id']).first()
            if food:
                multiplier = ingredient_data['grams'] / 100.0
                total_nutrition['calories'] += (food.calories or 0) * multiplier
                total_nutrition['protein_g'] += (food.protein_g or 0) * multiplier
                total_nutrition['fat_g'] += (food.fat_g or 0) * multiplier
                total_nutrition['carbs_g'] += (food.carbs_g or 0) * multiplier
                total_nutrition['vitamin_c_mg'] += (food.vitamin_c_mg or 0) * multiplier
                total_nutrition['calcium_mg'] += (food.calcium_mg or 0) * multiplier
                total_nutrition['iron_mg'] += (food.iron_mg or 0) * multiplier
        
        # Calculate per-serving nutrition
        servings = recipe.servings or 1.0
        recipe.calories_per_serving = total_nutrition['calories'] / servings
        recipe.protein_g_per_serving = total_nutrition['protein_g'] / servings
        recipe.fat_g_per_serving = total_nutrition['fat_g'] / servings
        recipe.carbs_g_per_serving = total_nutrition['carbs_g'] / servings
        recipe.vitamin_c_mg_per_serving = total_nutrition['vitamin_c_mg'] / servings
        recipe.calcium_mg_per_serving = total_nutrition['calcium_mg'] / servings
        recipe.iron_mg_per_serving = total_nutrition['iron_mg'] / servings
        
        db.commit()
        
        return jsonify({
            "message": "Recipe created successfully",
            "recipe_id": recipe.id,
            "nutrition_per_serving": {
                'calories': round(recipe.calories_per_serving, 1),
                'protein_g': round(recipe.protein_g_per_serving, 1),
                'fat_g': round(recipe.fat_g_per_serving, 1),
                'carbs_g': round(recipe.carbs_g_per_serving, 1)
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/recipes/<int:recipe_id>/to-food/<int:user_id>", methods=["POST"])
def convert_recipe_to_food(recipe_id: int, user_id: int):
    """Convert a recipe to a searchable food item"""
    try:
        from app.models import Recipe, Food
        
        db = next(get_db())
        
        # Get recipe
        recipe = db.query(Recipe).filter(
            Recipe.id == recipe_id,
            Recipe.user_id == user_id
        ).first()
        
        if not recipe:
            return jsonify({"error": "Recipe not found"}), 404
        
        # Create food entry from recipe
        food = Food(
            name=f"{recipe.name} (Recipe)",
            brand="Custom Recipe",
            data_source="recipe",
            calories=recipe.calories_per_serving,
            protein_g=recipe.protein_g_per_serving,
            fat_g=recipe.fat_g_per_serving,
            carbs_g=recipe.carbs_g_per_serving,
            vitamin_c_mg=recipe.vitamin_c_mg_per_serving,
            calcium_mg=recipe.calcium_mg_per_serving,
            iron_mg=recipe.iron_mg_per_serving
        )
        db.add(food)
        db.commit()
        db.refresh(food)
        
        return jsonify({
            "message": "Recipe converted to food successfully",
            "food_id": food.id,
            "food_name": food.name
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/recipes/<int:recipe_id>/<int:user_id>", methods=["DELETE"])
def delete_recipe(recipe_id: int, user_id: int):
    """Delete a recipe"""
    try:
        from app.models import Recipe
        
        db = next(get_db())
        
        recipe = db.query(Recipe).filter(
            Recipe.id == recipe_id,
            Recipe.user_id == user_id
        ).first()
        
        if not recipe:
            return jsonify({"error": "Recipe not found"}), 404
        
        db.delete(recipe)
        db.commit()
        
        return jsonify({"message": "Recipe deleted successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/advanced-goals/<int:user_id>", methods=["GET"])
def get_advanced_goals(user_id: int):
    """Get user's advanced goal settings"""
    try:
        from app.models import AdvancedGoalSettings
        from app.advanced_goals import GoalTemplate
        
        db = next(get_db())
        
        settings = db.query(AdvancedGoalSettings).filter(
            AdvancedGoalSettings.user_id == user_id
        ).first()
        
        if not settings:
            # Return default settings
            return jsonify({
                "goal_type": "static",
                "training_schedule": ["moderate", "moderate", "rest", "intense", "light", "intense", "rest"],
                "carb_cycling_pattern": "alternate",
                "custom_protein_ratio": None,
                "custom_fat_ratio": None,
                "custom_carb_ratio": None,
                "template_name": None,
                "available_templates": list(GoalTemplate.get_templates().keys())
            })
        
        return jsonify({
            "goal_type": settings.goal_type,
            "training_schedule": settings.training_schedule,
            "carb_cycling_pattern": settings.carb_cycling_pattern,
            "custom_protein_ratio": settings.custom_protein_ratio,
            "custom_fat_ratio": settings.custom_fat_ratio,
            "custom_carb_ratio": settings.custom_carb_ratio,
            "template_name": settings.template_name,
            "available_templates": list(GoalTemplate.get_templates().keys())
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/advanced-goals/<int:user_id>", methods=["POST"])
def update_advanced_goals(user_id: int):
    """Update user's advanced goal settings"""
    try:
        from app.models import AdvancedGoalSettings, DailyGoalCache
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        db = next(get_db())
        
        # Get or create settings
        settings = db.query(AdvancedGoalSettings).filter(
            AdvancedGoalSettings.user_id == user_id
        ).first()
        
        if not settings:
            settings = AdvancedGoalSettings(user_id=user_id)
            db.add(settings)
        
        # Update settings
        if 'goal_type' in data:
            settings.goal_type = data['goal_type']
        if 'training_schedule' in data:
            settings.training_schedule = data['training_schedule']
        if 'carb_cycling_pattern' in data:
            settings.carb_cycling_pattern = data['carb_cycling_pattern']
        if 'custom_protein_ratio' in data:
            settings.custom_protein_ratio = data['custom_protein_ratio']
        if 'custom_fat_ratio' in data:
            settings.custom_fat_ratio = data['custom_fat_ratio']
        if 'custom_carb_ratio' in data:
            settings.custom_carb_ratio = data['custom_carb_ratio']
        if 'template_name' in data:
            settings.template_name = data['template_name']
        
        # Clear goal cache since settings changed
        db.query(DailyGoalCache).filter(
            DailyGoalCache.user_id == user_id
        ).delete()
        
        db.commit()
        
        return jsonify({"message": "Advanced goals updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/advanced-goals/<int:user_id>/apply-template", methods=["POST"])
def apply_goal_template(user_id: int):
    """Apply a predefined goal template"""
    try:
        from app.models import AdvancedGoalSettings, User
        from app.advanced_goals import GoalTemplate
        
        data = request.get_json()
        template_name = data.get('template_name')
        
        if not template_name:
            return jsonify({"error": "Template name required"}), 400
        
        db = next(get_db())
        
        # Get user profile
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        user_profile = {
            'weight_kg': user.weight_kg,
            'height_cm': user.height_cm,
            'age': user.age,
            'gender': user.gender,
            'activity_level': user.activity_level,
            'goal_type': user.goal_type
        }
        
        # Apply template
        updated_profile = GoalTemplate.apply_template(template_name, user_profile)
        
        # Get or create advanced settings
        settings = db.query(AdvancedGoalSettings).filter(
            AdvancedGoalSettings.user_id == user_id
        ).first()
        
        if not settings:
            settings = AdvancedGoalSettings(user_id=user_id)
            db.add(settings)
        
        # Apply template settings
        settings.goal_type = updated_profile.get('goal_type', 'static')
        settings.training_schedule = updated_profile.get('training_schedule', settings.training_schedule)
        settings.carb_cycling_pattern = updated_profile.get('carb_cycling_pattern', settings.carb_cycling_pattern)
        settings.template_name = template_name
        
        # Apply custom macro ratios if specified
        macro_ratios = updated_profile.get('macro_ratios')
        if macro_ratios:
            settings.custom_protein_ratio = macro_ratios.get('protein')
            settings.custom_fat_ratio = macro_ratios.get('fat')
            settings.custom_carb_ratio = macro_ratios.get('carbs')
        
        db.commit()
        
        return jsonify({
            "message": f"Template '{template_name}' applied successfully",
            "template_description": GoalTemplate.get_templates()[template_name]['description']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/goals-for-date/<int:user_id>", methods=["GET"])
def get_goals_for_date(user_id: int):
    """Get nutrition goals for a specific date"""
    try:
        from app.models import User, AdvancedGoalSettings, DailyGoalCache
        from app.advanced_goals import advanced_goal_calculator
        from datetime import datetime, date
        
        # Get target date from query params
        date_str = request.args.get('date')
        if date_str:
            target_date = datetime.fromisoformat(date_str).date()
        else:
            target_date = date.today()
        
        db = next(get_db())
        
        # Check cache first
        cached_goals = db.query(DailyGoalCache).filter(
            DailyGoalCache.user_id == user_id,
            DailyGoalCache.goal_date == target_date
        ).first()
        
        if cached_goals:
            return jsonify({
                "date": target_date.isoformat(),
                "goals": {
                    "calories": cached_goals.calories,
                    "protein_g": cached_goals.protein_g,
                    "fat_g": cached_goals.fat_g,
                    "carbs_g": cached_goals.carbs_g,
                    "fiber_g": cached_goals.fiber_g,
                    "sodium_mg": cached_goals.sodium_mg
                },
                "metadata": {
                    "goal_type": cached_goals.goal_type,
                    "training_day": cached_goals.training_day,
                    "is_high_carb_day": cached_goals.is_high_carb_day
                },
                "cached": True
            })
        
        # Get user profile
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get advanced settings
        advanced_settings = db.query(AdvancedGoalSettings).filter(
            AdvancedGoalSettings.user_id == user_id
        ).first()
        
        # Build user profile for calculation
        user_profile = {
            'weight_kg': user.weight_kg or 70,
            'height_cm': user.height_cm or 170,
            'age': user.age or 25,
            'gender': user.gender or 'male',
            'activity_level': user.activity_level or 'moderate',
            'goal_type': user.goal_type or 'maintain'
        }
        
        # Add advanced settings if available
        if advanced_settings:
            user_profile.update({
                'advanced_goal_type': advanced_settings.goal_type,
                'training_schedule': advanced_settings.training_schedule,
                'carb_cycling_pattern': advanced_settings.carb_cycling_pattern,
                'custom_protein_ratio': advanced_settings.custom_protein_ratio,
                'custom_fat_ratio': advanced_settings.custom_fat_ratio,
                'custom_carb_ratio': advanced_settings.custom_carb_ratio
            })
        
        # Calculate goals for the date
        goals = advanced_goal_calculator.get_goals_for_date(user_profile, target_date)
        
        # Cache the results
        cache_entry = DailyGoalCache(
            user_id=user_id,
            goal_date=target_date,
            calories=goals['calories'],
            protein_g=goals['protein_g'],
            fat_g=goals['fat_g'],
            carbs_g=goals['carbs_g'],
            fiber_g=goals['fiber_g'],
            sodium_mg=goals['sodium_mg'],
            goal_type=user_profile.get('advanced_goal_type', 'static')
        )
        
        try:
            db.add(cache_entry)
            db.commit()
        except Exception:
            # Handle duplicate key error gracefully
            db.rollback()
        
        return jsonify({
            "date": target_date.isoformat(),
            "goals": {
                "calories": round(goals['calories'], 1),
                "protein_g": round(goals['protein_g'], 1),
                "fat_g": round(goals['fat_g'], 1),
                "carbs_g": round(goals['carbs_g'], 1),
                "fiber_g": round(goals['fiber_g'], 1),
                "sodium_mg": round(goals['sodium_mg'], 1)
            },
            "metadata": {
                "goal_type": user_profile.get('advanced_goal_type', 'static'),
                "training_day": None,  # Would need to be calculated
                "is_high_carb_day": None  # Would need to be calculated
            },
            "cached": False
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/goal-templates", methods=["GET"])
def get_goal_templates():
    """Get available goal templates"""
    try:
        from app.advanced_goals import GoalTemplate
        
        templates = GoalTemplate.get_templates()
        
        # Format templates for frontend
        formatted_templates = []
        for name, template in templates.items():
            formatted_templates.append({
                'name': name,
                'display_name': template['name'],
                'description': template['description'],
                'goal_type': template['goal_type'],
                'suitable_for': {
                    'bodybuilding_prep': ['Contest prep', 'Cutting', 'High protein'],
                    'powerlifting': ['Strength training', 'Powerlifting', 'Heavy lifting'],
                    'carb_cycling': ['Fat loss', 'Body recomposition', 'Metabolic flexibility'],
                    'weekend_warrior': ['Recreational athletes', 'Busy professionals', 'Weekend activities']
                }.get(name, ['General fitness'])
            })
        
        return jsonify({"templates": formatted_templates})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/barcode/scan", methods=["POST"])
def scan_barcode():
    """Scan barcode from camera or uploaded image"""
    try:
        from app.barcode_scanner import barcode_api, barcode_history, validate_upc, decode_barcode_image
        from app.models import BarcodeHistory, Food
        
        data = request.get_json()
        user_id = data.get('user_id', 1)
        
        # Handle different input types
        if 'upc' in data:
            # Manual UPC input
            upc = data['upc'].strip()
            scan_method = "manual"
        elif 'image_data' in data:
            # Base64 encoded image
            import base64
            image_bytes = base64.b64decode(data['image_data'])
            upc = decode_barcode_image(image_bytes)
            scan_method = "camera"
            
            if not upc:
                barcode_history.record_scan("unknown", False, None, user_id)
                return jsonify({
                    "success": False,
                    "error": "No barcode detected in image",
                    "suggestions": [
                        "Ensure the barcode is clearly visible",
                        "Try better lighting",
                        "Hold the camera steady",
                        "Get closer to the barcode"
                    ]
                }), 400
        else:
            return jsonify({"error": "UPC or image_data required"}), 400
        
        # Validate UPC
        if not validate_upc(upc):
            barcode_history.record_scan(upc, False, None, user_id)
            return jsonify({
                "success": False,
                "error": f"Invalid UPC format: {upc}",
                "upc": upc
            }), 400
        
        db = next(get_db())
        
        # First check if we already have this product in our database
        existing_food = db.query(Food).filter(Food.upc == upc).first()
        
        if existing_food:
            product_data = {
                'name': existing_food.name,
                'brand': existing_food.brand,
                'source': 'local_db',
                'nutrition': {
                    'calories': existing_food.calories,
                    'protein_g': existing_food.protein_g,
                    'fat_g': existing_food.fat_g,
                    'carbs_g': existing_food.carbs_g,
                    'fiber_g': existing_food.fiber_g,
                    'sodium_mg': existing_food.sodium_mg,
                    'vitamin_c_mg': existing_food.vitamin_c_mg,
                    'calcium_mg': existing_food.calcium_mg,
                    'iron_mg': existing_food.iron_mg
                }
            }
            
            barcode_history.record_scan(upc, True, product_data, user_id)
            
            return jsonify({
                "success": True,
                "upc": upc,
                "product": product_data,
                "scan_method": scan_method,
                "source": "local_database",
                "food_id": existing_food.id
            })
        
        # If not in local DB, try external APIs
        product_data = barcode_api.lookup_product(upc)
        
        if product_data:
            # Record successful scan
            barcode_history.record_scan(upc, True, product_data, user_id)
            
            # Optionally create a Food entry for future use
            if data.get('save_to_db', True):
                try:
                    new_food = Food(
                        name=product_data['name'],
                        brand=product_data['brand'],
                        upc=upc,
                        data_source=product_data['source'],
                        calories=product_data['nutrition']['calories'],
                        protein_g=product_data['nutrition']['protein_g'],
                        fat_g=product_data['nutrition']['fat_g'],
                        carbs_g=product_data['nutrition']['carbs_g'],
                        fiber_g=product_data['nutrition'].get('fiber_g'),
                        sodium_mg=product_data['nutrition'].get('sodium_mg'),
                        vitamin_c_mg=product_data['nutrition'].get('vitamin_c_mg'),
                        calcium_mg=product_data['nutrition'].get('calcium_mg'),
                        iron_mg=product_data['nutrition'].get('iron_mg')
                    )
                    db.add(new_food)
                    db.commit()
                    db.refresh(new_food)
                    
                    product_data['food_id'] = new_food.id
                except Exception as e:
                    print(f"Error saving food to DB: {e}")
                    db.rollback()
            
            return jsonify({
                "success": True,
                "upc": upc,
                "product": product_data,
                "scan_method": scan_method,
                "source": product_data['source']
            })
        else:
            # Record failed scan
            barcode_history.record_scan(upc, False, None, user_id)
            
            return jsonify({
                "success": False,
                "upc": upc,
                "error": "Product not found in any database",
                "suggestions": [
                    "Try searching by product name instead",
                    "Check if the barcode is correct",
                    "This might be a local/regional product",
                    "Consider adding this product manually"
                ]
            }), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/barcode/history/<int:user_id>", methods=["GET"])
def get_barcode_history(user_id: int):
    """Get user's barcode scan history"""
    try:
        from app.barcode_scanner import barcode_history
        
        limit = int(request.args.get('limit', 50))
        history = barcode_history.get_scan_history(user_id, limit)
        
        # Get success rate
        total_scans = len(history)
        successful_scans = sum(1 for scan in history if scan['success'])
        success_rate = (successful_scans / total_scans * 100) if total_scans > 0 else 0
        
        return jsonify({
            "history": history,
            "stats": {
                "total_scans": total_scans,
                "successful_scans": successful_scans,
                "success_rate": round(success_rate, 1)
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/barcode/popular", methods=["GET"])
def get_popular_barcodes():
    """Get most frequently scanned products"""
    try:
        from app.barcode_scanner import barcode_history
        
        limit = int(request.args.get('limit', 20))
        popular = barcode_history.get_popular_products(limit)
        
        return jsonify({"popular_products": popular})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Social Features API Endpoints

@app.route("/social/feed/<int:user_id>", methods=["GET"])
def get_social_feed(user_id: int):
    """Get social feed for user (following + public posts)"""
    try:
        from app.models import SharedFood, UserFollow, User
        from sqlalchemy.orm import joinedload
        from sqlalchemy import or_, desc
        
        db = next(get_db())
        limit = int(request.args.get('limit', 20))
        
        # Get users that this user follows
        following_query = db.query(UserFollow.following_id).filter(UserFollow.follower_id == user_id)
        following_ids = [f.following_id for f in following_query.all()]
        following_ids.append(user_id)  # Include own posts
        
        # Get shared foods from following + popular public posts
        shared_foods = db.query(SharedFood).options(
            joinedload(SharedFood.user),
            joinedload(SharedFood.food),
            joinedload(SharedFood.recipe)
        ).filter(
            or_(
                SharedFood.user_id.in_(following_ids),  # From following
                SharedFood.is_public == True  # Public posts
            )
        ).order_by(desc(SharedFood.created_at)).limit(limit).all()
        
        feed_items = []
        for shared_food in shared_foods:
            feed_items.append({
                'id': shared_food.id,
                'user': {
                    'id': shared_food.user.id,
                    'username': shared_food.user.username,
                    'email': shared_food.user.email
                },
                'food': {
                    'id': shared_food.food.id,
                    'name': shared_food.food.name,
                    'brand': shared_food.food.brand,
                    'calories': shared_food.food.calories,
                    'protein_g': shared_food.food.protein_g
                },
                'caption': shared_food.caption,
                'tags': shared_food.tags,
                'is_recipe': shared_food.is_recipe,
                'likes_count': shared_food.likes_count,
                'comments_count': shared_food.comments_count,
                'created_at': shared_food.created_at.isoformat(),
                'is_public': shared_food.is_public
            })
        
        return jsonify({"feed": feed_items})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/social/share", methods=["POST"])
def share_food():
    """Share a food or recipe to the community"""
    try:
        from app.models import SharedFood, ActivityFeed
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        db = next(get_db())
        
        shared_food = SharedFood(
            user_id=data.get('user_id', 1),
            food_id=data['food_id'],
            caption=data.get('caption', ''),
            tags=data.get('tags', []),
            is_recipe=data.get('is_recipe', False),
            recipe_id=data.get('recipe_id'),
            is_public=data.get('is_public', True)
        )
        
        db.add(shared_food)
        db.commit()
        db.refresh(shared_food)
        
        # Add to activity feed
        activity = ActivityFeed(
            user_id=shared_food.user_id,
            activity_type='shared_food',
            shared_food_id=shared_food.id,
            activity_data={
                'food_name': data.get('food_name', ''),
                'caption': shared_food.caption[:100]  # Truncated for feed
            }
        )
        db.add(activity)
        db.commit()
        
        return jsonify({
            "message": "Food shared successfully",
            "shared_food_id": shared_food.id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/social/like", methods=["POST"])
def like_shared_food():
    """Like or unlike a shared food"""
    try:
        from app.models import SharedFoodLike, SharedFood
        
        data = request.get_json()
        user_id = data.get('user_id', 1)
        shared_food_id = data['shared_food_id']
        
        db = next(get_db())
        
        # Check if already liked
        existing_like = db.query(SharedFoodLike).filter(
            SharedFoodLike.user_id == user_id,
            SharedFoodLike.shared_food_id == shared_food_id
        ).first()
        
        if existing_like:
            # Unlike
            db.delete(existing_like)
            
            # Decrease like count
            shared_food = db.query(SharedFood).filter(SharedFood.id == shared_food_id).first()
            if shared_food:
                shared_food.likes_count = max(0, shared_food.likes_count - 1)
            
            db.commit()
            return jsonify({"message": "Unliked", "liked": False})
        else:
            # Like
            new_like = SharedFoodLike(
                user_id=user_id,
                shared_food_id=shared_food_id
            )
            db.add(new_like)
            
            # Increase like count
            shared_food = db.query(SharedFood).filter(SharedFood.id == shared_food_id).first()
            if shared_food:
                shared_food.likes_count += 1
            
            db.commit()
            return jsonify({"message": "Liked", "liked": True})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/social/comment", methods=["POST"])
def comment_on_shared_food():
    """Add a comment to a shared food"""
    try:
        from app.models import SharedFoodComment, SharedFood
        
        data = request.get_json()
        if not data or not data.get('content'):
            return jsonify({"error": "Comment content required"}), 400
        
        db = next(get_db())
        
        comment = SharedFoodComment(
            user_id=data.get('user_id', 1),
            shared_food_id=data['shared_food_id'],
            content=data['content']
        )
        
        db.add(comment)
        
        # Increase comment count
        shared_food = db.query(SharedFood).filter(SharedFood.id == data['shared_food_id']).first()
        if shared_food:
            shared_food.comments_count += 1
        
        db.commit()
        
        return jsonify({"message": "Comment added successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/social/challenges", methods=["GET"])
def get_challenges():
    """Get active community challenges"""
    try:
        from app.models import Challenge, ChallengeParticipant
        from sqlalchemy.orm import joinedload
        from datetime import date
        
        db = next(get_db())
        
        # Get active challenges
        challenges = db.query(Challenge).options(
            joinedload(Challenge.creator)
        ).filter(
            Challenge.end_date >= date.today(),
            Challenge.is_public == True
        ).order_by(Challenge.created_at.desc()).limit(10).all()
        
        challenge_list = []
        for challenge in challenges:
            challenge_list.append({
                'id': challenge.id,
                'title': challenge.title,
                'description': challenge.description,
                'challenge_type': challenge.challenge_type,
                'target_value': challenge.target_value,
                'target_unit': challenge.target_unit,
                'start_date': challenge.start_date.isoformat(),
                'end_date': challenge.end_date.isoformat(),
                'participants_count': challenge.participants_count,
                'max_participants': challenge.max_participants,
                'creator': {
                    'username': challenge.creator.username
                },
                'days_remaining': (challenge.end_date - date.today()).days
            })
        
        return jsonify({"challenges": challenge_list})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/social/challenges/join", methods=["POST"])
def join_challenge():
    """Join a community challenge"""
    try:
        from app.models import ChallengeParticipant, Challenge
        
        data = request.get_json()
        user_id = data.get('user_id', 1)
        challenge_id = data['challenge_id']
        
        db = next(get_db())
        
        # Check if already participating
        existing = db.query(ChallengeParticipant).filter(
            ChallengeParticipant.user_id == user_id,
            ChallengeParticipant.challenge_id == challenge_id
        ).first()
        
        if existing:
            return jsonify({"error": "Already participating in this challenge"}), 400
        
        # Check if challenge is full
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            return jsonify({"error": "Challenge not found"}), 404
        
        if challenge.max_participants and challenge.participants_count >= challenge.max_participants:
            return jsonify({"error": "Challenge is full"}), 400
        
        # Join challenge
        participant = ChallengeParticipant(
            user_id=user_id,
            challenge_id=challenge_id
        )
        db.add(participant)
        
        # Update participant count
        challenge.participants_count += 1
        
        db.commit()
        
        return jsonify({"message": "Successfully joined challenge"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/social/follow", methods=["POST"])
def follow_user():
    """Follow or unfollow a user"""
    try:
        from app.models import UserFollow
        
        data = request.get_json()
        follower_id = data.get('follower_id', 1)
        following_id = data['following_id']
        
        if follower_id == following_id:
            return jsonify({"error": "Cannot follow yourself"}), 400
        
        db = next(get_db())
        
        # Check if already following
        existing_follow = db.query(UserFollow).filter(
            UserFollow.follower_id == follower_id,
            UserFollow.following_id == following_id
        ).first()
        
        if existing_follow:
            # Unfollow
            db.delete(existing_follow)
            db.commit()
            return jsonify({"message": "Unfollowed", "following": False})
        else:
            # Follow
            new_follow = UserFollow(
                follower_id=follower_id,
                following_id=following_id
            )
            db.add(new_follow)
            db.commit()
            return jsonify({"message": "Now following", "following": True})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/social/users/search", methods=["GET"])
def search_users():
    """Search for users to follow"""
    try:
        from app.models import User
        
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({"users": []})
        
        db = next(get_db())
        
        users = db.query(User).filter(
            User.username.ilike(f"%{query}%")
        ).limit(10).all()
        
        user_list = []
        for user in users:
            user_list.append({
                'id': user.id,
                'username': user.username,
                'email': user.email
            })
        
        return jsonify({"users": user_list})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
