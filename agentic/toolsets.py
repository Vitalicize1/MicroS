from typing import List
from langchain.tools import StructuredTool

from .lc_tools import (
    FOOD_SEARCH_TOOL,
    LOOKUP_UPC_TOOL,
    LIST_FOODS_TOOL,
    LOG_MEAL_TOOL,
    LIST_MEALS_TOOL,
    COMPUTE_DAY_TOOL,
    GET_GOALS_TOOL,
)


def get_search_tools() -> List[StructuredTool]:
    """Tools the FoodSearchAgent can call."""
    return [FOOD_SEARCH_TOOL, LIST_FOODS_TOOL, LOOKUP_UPC_TOOL]


def get_logging_tools() -> List[StructuredTool]:
    """Tools the LoggingAgent can call."""
    return [LOG_MEAL_TOOL, LIST_FOODS_TOOL, LIST_MEALS_TOOL]


def get_analysis_tools() -> List[StructuredTool]:
    """Tools the AnalysisAgent can call."""
    return [COMPUTE_DAY_TOOL, GET_GOALS_TOOL]


def get_recommend_tools() -> List[StructuredTool]:
    """Minimal tools for RecommendationAgent (context-only)."""
    return [COMPUTE_DAY_TOOL, GET_GOALS_TOOL]
