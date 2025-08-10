from typing import List
from langchain.tools import StructuredTool

from agentic.lc_tools import (
    FOOD_SEARCH_TOOL,
    LIST_FOODS_TOOL,
    LOOKUP_UPC_TOOL,
)

TOOL_NAMES = [
    FOOD_SEARCH_TOOL.name,
    LIST_FOODS_TOOL.name,
    LOOKUP_UPC_TOOL.name,
]

def get_tools() -> List[StructuredTool]:
    return [FOOD_SEARCH_TOOL, LIST_FOODS_TOOL, LOOKUP_UPC_TOOL]
