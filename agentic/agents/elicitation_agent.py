from typing import Dict, Any, List

class ElicitationAgent:
    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Ask exactly one clarifying question based on missing info.
        Leaves needs_clarification=True so caller can prompt the user and resume.
        """
        questions: List[str] = []
        entities = state.get("entities", {}) or {}
        intent = state.get("intent")

        if intent == "log_meal":
            if not entities.get("food_id") and not state.get("selected_food") and not state.get("food_candidates"):
                questions.append("Which food would you like to log? You can say a name or provide food_id.")
            if not entities.get("grams"):
                questions.append("How many grams?")
            if not entities.get("meal_type"):
                questions.append("Which meal was this for (breakfast/lunch/dinner/snack)?")
        elif intent in ("search_food", "scan_barcode"):
            if intent == "search_food" and not entities.get("food_name"):
                questions.append("What food would you like to search for?")
            if intent == "scan_barcode" and not entities.get("upc"):
                questions.append("Please provide the UPC (12 digits).")
        elif intent in ("daily_summary", "recommend"):
            if not entities.get("date"):
                questions.append("For which day? You can say 'today' or 'yesterday'.")

        # Fallback generic question if nothing matched
        if not questions:
            questions.append("Could you clarify your request with a bit more detail?")

        # Reply with exactly one question
        state["needs_clarification"] = True
        state["questions"] = [questions[0]]
        state["response"] = questions[0]
        return state
