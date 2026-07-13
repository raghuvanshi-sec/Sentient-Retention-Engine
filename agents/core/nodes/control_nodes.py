import time
from typing import Dict, Any
from ..state import RetentionState
from .utils import emit_telemetry
from ..database import create_retention_action, create_agent_memory

def node_human_handoff(state: RetentionState) -> Dict[str, Any]:
    """
    [Agent 7: HumanHandoffAgent]
    Purpose: Bridges AI uncertainty with specialist intervention by persisting cases to the management queue.
    """
    customer_id = state.get("customer_id")
    risk_score = state.get("risk_score", 0.5)
    violations = state.get("policy_violations", [])
    reason = violations[0] if violations else "Low AI confidence / ROI threshold fail"
    
    emit_telemetry(state, "HumanHandoffAgent", "ESCALATION_TRIGGERED", 
                   f"Escalating customer {customer_id} to human specialist. Reason: {reason}")
    
    # Persist the escalation to the database for the Admin Dashboard
    # This creates a 'pending' record in retention_actions that specialists can 'claim'
    escalation_id = create_retention_action(customer_id, "ESCALATION", "pending")
    
    # Record in agent memory
    create_agent_memory(
        customer_id=customer_id,
        action="HUMAN_INTERVENTION",
        result="escalated",
        churn_risk=risk_score,
        reason=f"Governance Failure: {reason}. Manual review required."
    )
    
    return {
        "status": "HANDOFF_COMPLETE",
        "specialist_queue_id": f"SQ-{escalation_id}" if escalation_id else "PENDING_QUEUE",
        "handoff_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "escalated_to_human": True,
        "human_status": "PENDING",
        "escalation_id": str(escalation_id) if escalation_id else None,
        "escalation_reason": reason,
        "final_action": "HUMAN_REVIEW_REQUIRED",
        "message": f"ESCALATION_SUCCESS: Case {escalation_id or 'NEW'} added to Specialist Queue. Reason: {reason}",
        "agent_telemetry": state.get("agent_telemetry", [])
    }
