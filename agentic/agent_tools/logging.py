from typing import List
from langchain.tools import StructuredTool

from agentic.lc_tools import (
    LOG_MEAL_TOOL,
    UPDATE_MEAL_TOOL,
    DELETE_MEAL_TOOL,
    LIST_FOODS_TOOL,
    LIST_MEALS_TOOL,
    RECENT_FOODS_TOOL,
)

TOOL_NAMES = [
    LOG_MEAL_TOOL.name,
    UPDATE_MEAL_TOOL.name,
    DELETE_MEAL_TOOL.name,
    LIST_FOODS_TOOL.name,
    LIST_MEALS_TOOL.name,
    RECENT_FOODS_TOOL.name,
]

def get_tools() -> List[StructuredTool]:
    return [LOG_MEAL_TOOL, UPDATE_MEAL_TOOL, DELETE_MEAL_TOOL, LIST_FOODS_TOOL, LIST_MEALS_TOOL, RECENT_FOODS_TOOL]
