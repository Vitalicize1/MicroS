from typing import Dict, Any
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from .state import GraphState
from .agents.orchestrator import OrchestratorAgent
from .agents.barcode_agent import BarcodeAgent
from .agents.food_search_agent import FoodSearchAgent
from .agents.logging_agent import LoggingAgent
from .agents.analysis_agent import AnalysisAgent
from .agents.evaluator_agent import EvaluatorOptimizer
from .agents.elicitation_agent import ElicitationAgent
from .agents.recommendation_agent import RecommendationAgent
from .agent_tools.search import get_tools as get_search_tools
from .agent_tools.logging import get_tools as get_logging_tools
from .agent_tools.analysis import get_tools as get_analysis_tools
from .agent_tools.recommendation import get_tools as get_recommend_tools
from .prompts import (
    get_search_prompt,
    get_logging_prompt,
    get_analysis_prompt,
    get_recommend_prompt,
)
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import SystemMessage
from agentic.llm_factory import get_llm


def create_graph():
    orchestrator = OrchestratorAgent()
    evaluator = EvaluatorOptimizer()
    elicitation = ElicitationAgent()
    barcode_agent = BarcodeAgent()
    food_search_agent = FoodSearchAgent()
    logging_agent = LoggingAgent()
    analysis_agent = AnalysisAgent()
    recommendation_agent = RecommendationAgent()

    try:
        llm: BaseChatModel = get_llm()
    except Exception:
        llm = None

    workflow = StateGraph(GraphState)

    workflow.add_node("orchestrator", orchestrator.run)
    workflow.set_entry_point("orchestrator")
    workflow.add_node("barcode", barcode_agent.run)

    def add_agent_tool_pipeline(prefix: str, tools, post_func, system_prompt: str):
        post_name = f"{prefix}_post"
        workflow.add_node(post_name, post_func)
        if llm is None:
            return None
        llm_node_name = f"{prefix}_llm"
        tools_node_name = f"{prefix}_tools"
        # Bind tools; system prompt will be injected as a SystemMessage in the messages list per call
        llm_bound = llm.bind_tools(tools)

        def llm_node(state: Dict[str, Any]) -> Dict[str, Any]:
            msgs = state.get("messages") or []
            if not msgs:
                msgs = [{"role": "user", "content": state.get("input_text", "")}]
            # Prepend/ensure system message
            if not msgs or (isinstance(msgs[0], dict) and msgs[0].get("role") != "system") or (hasattr(msgs[0], "type") and getattr(msgs[0], "type", "") != "system"):
                msgs = [SystemMessage(content=system_prompt)] + msgs
            state["messages"] = msgs
            result = llm_bound.invoke(state["messages"])  # AIMessage
            state["messages"] = state["messages"] + [result]
            state["response"] = getattr(result, "content", str(result))
            return state

        workflow.add_node(llm_node_name, llm_node)
        workflow.add_node(tools_node_name, ToolNode(tools=tools))
        workflow.add_conditional_edges(llm_node_name, tools_condition, {"tools": tools_node_name, END: post_name})
        workflow.add_edge(tools_node_name, llm_node_name)
        return llm_node_name, post_name

    # Pipelines with prompts
    search_nodes = add_agent_tool_pipeline("search", get_search_tools(), food_search_agent.run, get_search_prompt())
    logging_nodes = add_agent_tool_pipeline("logging", get_logging_tools(), logging_agent.run, get_logging_prompt())
    analysis_nodes = add_agent_tool_pipeline("analysis", get_analysis_tools(), analysis_agent.run, get_analysis_prompt())
    recommend_nodes = add_agent_tool_pipeline("recommend", get_recommend_tools(), recommendation_agent.run, get_recommend_prompt())

    workflow.add_node("evaluator", evaluator.run)
    workflow.add_node("elicitation", elicitation.run)

    def needs_elicitation(state: Dict[str, Any]) -> str:
        return "to_elicitation" if state.get("needs_clarification") else "to_end"

    for nodes in [search_nodes, logging_nodes, analysis_nodes, recommend_nodes]:
        if nodes is None:
            continue
        _, post = nodes
        workflow.add_edge(post, "evaluator")
    workflow.add_edge("barcode", "evaluator")
    workflow.add_conditional_edges("evaluator", needs_elicitation, {"to_elicitation": "elicitation", "to_end": END})
    workflow.add_edge("elicitation", END)

    def route_by_intent(state: Dict[str, Any]) -> str:
        intent = state.get("intent", "search_food")
        if intent == "scan_barcode":
            return "barcode"
        elif intent == "search_food":
            return search_nodes[0] if search_nodes else "search_post"
        elif intent == "log_meal":
            return logging_nodes[0] if logging_nodes else "logging_post"
        elif intent == "daily_summary":
            return analysis_nodes[0] if analysis_nodes else "analysis_post"
        elif intent == "recommend":
            return recommend_nodes[0] if recommend_nodes else "recommend_post"
        else:
            return search_nodes[0] if search_nodes else "search_post"

    workflow.add_conditional_edges("orchestrator", route_by_intent, {
        "barcode": "barcode",
        (search_nodes[0] if search_nodes else "search_post"): (search_nodes[0] if search_nodes else "search_post"),
        (logging_nodes[0] if logging_nodes else "logging_post"): (logging_nodes[0] if logging_nodes else "logging_post"),
        (analysis_nodes[0] if analysis_nodes else "analysis_post"): (analysis_nodes[0] if analysis_nodes else "analysis_post"),
        (recommend_nodes[0] if recommend_nodes else "recommend_post"): (recommend_nodes[0] if recommend_nodes else "recommend_post"),
    })

    return workflow.compile()


def run_agent(user_id: int, message: str) -> Dict[str, Any]:
    initial_state: GraphState = {
        "messages": [],
        "user_id": user_id,
        "input_text": message,
        "intent": None,
        "entities": {},
        "food_candidates": [],
        "selected_food": None,
        "log_entry": None,
        "day_totals": None,
        "goals": None,
        "response": "",
        "needs_clarification": False,
        "questions": [],
        "confidence": 0.0,
    }
    graph = create_graph()
    return graph.invoke(initial_state)
