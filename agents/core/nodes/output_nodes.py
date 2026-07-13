import time
from typing import Dict, Any
from ..state import RetentionState
from .utils import emit_telemetry
from ..governance_engine import governance_protected

@governance_protected("analyze_feedback")
def node_feedback_learning(state: RetentionState) -> Dict[str, Any]:
    """
    [Agent 9: FeedbackLearningAgent]
    Purpose: Closes the loop by learning from outcome data.
    """
    emit_telemetry(state, "FeedbackLearningAgent", "LEARNING_STARTED", "Capturing execution metrics for continuous improvement.")
    
    # Capture metrics for the learning loop
    metrics = {
        "customer_id": state.get("customer_id"),
        "risk_level": state.get("risk_level"),
        "strategy_selected": state.get("final_action"),
        "predicted_success": state.get("decision_confidence"),
        "timestamp": time.time()
    }
    
    emit_telemetry(state, "FeedbackLearningAgent", "LEARNING_COMPLETED", 
                   "Metrics captured for model retraining.")
    
    return {
        "feedback_metrics": metrics,
        "agent_telemetry": state.get("agent_telemetry", [])
    }
