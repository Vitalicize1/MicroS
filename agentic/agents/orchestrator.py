from typing import Dict, Any
import json
import os
from ..llm_factory import get_llm

ALLOWED_INTENTS = [
    "scan_barcode",
    "search_food",
    "log_meal",
    "daily_summary",
    "recommend",
]

class OrchestratorAgent:
    def __init__(self):
        try:
            self.llm = get_llm()
        except ValueError as e:
            print(f"Warning: {e}. Using fallback mode.")
            self.llm = None

    def _build_prompt(self, user_text: str) -> str:
        allowed = ", ".join(ALLOWED_INTENTS)
        return (
            "You are an intent and entity extractor for a nutrition app.\n"
            "Return STRICT JSON with keys: intent, entities, confidence.\n\n"
            f"Allowed intents: {allowed}\n"
            "Entities: food_name, grams, upc, meal_type, date, food_id (use null if not present).\n"
            "Rules: extract concise food_name (e.g., 'oats'), parse 'food_id=3', '100g'/'80 grams', 12-digit UPC;"
            " set date to 'today' if user says today.\n\n"
            "User message:\n" + user_text + "\n"
        )

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Classify intent and extract entities"""
        if self.llm is None:
            # Fallback mode - simple keyword matching
            return self._heuristic_intent(state)
        
        try:
            prompt = self._build_prompt(state["input_text"])
            response = self.llm.invoke(prompt)
            result = json.loads(response.content)
            state["intent"] = result.get("intent")
            state["entities"] = result.get("entities", {})
            state["confidence"] = float(result.get("confidence", 0.7))
            return state
        except Exception as e:
            print(f"LLM parsing error: {e}. Falling back to heuristics.")
            return self._heuristic_intent(state)
    
    def _heuristic_intent(self, state: Dict[str, Any]) -> Dict[str, Any]:
        text = state["input_text"].lower().strip()
        entities: Dict[str, Any] = {"food_name": None, "grams": None, "upc": None, "meal_type": None, "date": None, "food_id": None}
        import re
        m = re.search(r"(\d+(?:\.\d+)?)\s*(g|grams?)\b", text)
        if m:
            try: entities["grams"] = float(m.group(1))
            except: pass
        m = re.search(r"food_id\s*=\s*(\d+)", text)
        if m: entities["food_id"] = int(m.group(1))
        m = re.search(r"\b(\d{12})\b", text)
        if m: entities["upc"] = m.group(1)
        for mt in ["breakfast", "lunch", "dinner", "snack"]:
            if mt in text: entities["meal_type"] = mt; break
        if "yesterday" in text: entities["date"] = "yesterday"
        elif "today" in text: entities["date"] = "today"

        # intent
        if any(k in text for k in ["barcode", "upc", "scan"]): intent = "scan_barcode"
        elif text.startswith("search "): intent = "search_food"; entities["food_name"] = state["input_text"][7:].strip()
        elif any(k in text for k in ["recommend", "suggest"]): intent = "recommend"; entities["date"] = entities["date"] or "today"
        elif any(k in text for k in ["summary", "report"]) or text in ("today", "yesterday"): intent = "daily_summary"; entities["date"] = entities["date"] or "today"
        elif any(k in text for k in ["log", "ate", "consumed"]) or entities["food_id"] or entities["grams"]: intent = "log_meal"
        else: intent = "search_food"

        state["intent"] = intent
        state["entities"] = entities
        state["confidence"] = 0.5
        return state
