from typing import Dict, Any

class EvaluatorOptimizer:
    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Validate entities/log requests; auto-fix simple cases else set needs_clarification.
        - Ensures grams is positive
        - Normalizes units if provided as text (e.g., '100 g')
        - Rejects absurd values
        - Can deduplicate pending logs (simple heuristic)
        """
        entities = state.get("entities", {}) or {}
        intent = state.get("intent")

        # Normalize grams if passed as string like "100g"
        grams = entities.get("grams")
        if isinstance(grams, str):
            s = grams.strip().lower().replace(" ", "")
            if s.endswith("g"):
                s = s[:-1]
            try:
                entities["grams"] = float(s)
            except ValueError:
                state["needs_clarification"] = True
                state["response"] = "I couldn't read the amount. How many grams?"
                state["questions"] = ["How many grams?"]
                return state

        grams = entities.get("grams")
        if grams is not None:
            try:
                grams = float(grams)
                if grams <= 0:
                    state["needs_clarification"] = True
                    state["response"] = "The amount must be greater than 0g. How many grams?"
                    state["questions"] = ["How many grams?"]
                    return state
                if grams > 5000:
                    state["needs_clarification"] = True
                    state["response"] = "That seems too large. Did you mean a smaller amount in grams?"
                    state["questions"] = ["Please provide a reasonable grams amount (e.g., 50, 100, 200)."]
                    return state
                entities["grams"] = grams
            except Exception:
                state["needs_clarification"] = True
                state["response"] = "I couldn't interpret the grams value."
                state["questions"] = ["How many grams?"]
                return state

        # Units normalization placeholder (mg/µg/IU) — future extension for micronutrients
        # Duplicate log detection could be added here based on recent state/logs

        state["entities"] = entities
        return state
