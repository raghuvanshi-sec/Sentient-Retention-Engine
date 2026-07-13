from langgraph.graph import StateGraph, START, END
from .state import RetentionState
from .nodes import (
    node_risk_analysis,
    node_strategy_planning,
    node_simulation,
    node_decision,
    node_human_handoff,
    node_feedback_learning
)

def build_workflow():
    workflow = StateGraph(RetentionState)
    
    # 1. Add core nodes
    workflow.add_node("risk_analysis", node_risk_analysis)
    workflow.add_node("strategy_planning", node_strategy_planning)
    workflow.add_node("simulation", node_simulation)
    workflow.add_node("decision", node_decision)
    workflow.add_node("human_handoff", node_human_handoff)
    workflow.add_node("feedback_learning", node_feedback_learning)
    
    # 2. Linear Spine Edges
    workflow.add_edge(START, "risk_analysis")
    workflow.add_edge("risk_analysis", "strategy_planning")
    workflow.add_edge("strategy_planning", "simulation")
    workflow.add_edge("simulation", "decision")
    
    # 3. Decision Conditional Routing (Governance Validation check)
    def route_decision(state: RetentionState) -> str:
        """
        Routes based on validation status from DecisionAgent.
        """
        if state.get("validation_passed"):
            return "approved"
        return "escalate"

    workflow.add_conditional_edges(
        "decision",
        route_decision,
        {
            "approved": "feedback_learning",
            "escalate": "human_handoff"
        }
    )
    
    # 4. Handoff to Feedback Learning
    workflow.add_edge("human_handoff", "feedback_learning")
    
    # 5. Continuous Learning Loop / End
    workflow.add_edge("feedback_learning", END)
    
    return workflow.compile()
