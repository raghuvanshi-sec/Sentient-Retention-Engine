import os
import json



# Core Governance Policies (Hardcoded Fail-safes) - Fallbacks
HARDCODED_POLICIES = {
    "RiskAnalysisAgent": {
        "allowed_actions": ["analyze_risk", "fetch_customer_data"],
        "blocked_actions": ["execute_discounts", "modify_contracts"]
    },
    "StrategyPlanningAgent": {
        "allowed_actions": ["generate_strategies", "evaluate_roi"],
        "blocked_actions": ["execute_discounts"]
    },
    "SimulationAgent": {
        "allowed_actions": [
            "run_simulations",
            "analyze_scenarios"
        ],
        "blocked_actions": [
            "execute_discounts",
            "trigger_crm_actions"
        ]
    },
    "DecisionAgent": {
        "allowed_actions": ["rank_strategies", "select_optimal_path"],
        "blocked_actions": ["execute_discounts"]
    },
    "ActionAgent": {
        "allowed_actions": [
            "execute_approved_retention_workflows",
            "send_offers"
        ],
        "blocked_actions": [
            "bypass_governance_validation"
        ]
    },
    "GovernanceEngine": {
        "allowed_actions": [
            "validate_workflows",
            "block_unsafe_actions",
            "trigger_escalation"
        ],
        "blocked_actions": []
    },
    "HumanHandoffAgent": {
        "allowed_actions": ["escalate_case", "create_task"],
        "blocked_actions": []
    },
    "FeedbackLearningAgent": {
        "allowed_actions": ["analyze_feedback", "update_model_parameters"],
        "blocked_actions": ["modify_live_policies"]
    }
}

# Impact-Level Thresholds
IMPACT_THRESHOLDS = {
    "FINANCIAL_LIMIT": 500.0,       # Max discount value in USD
    "CONFIDENCE_FLOOR": 0.85,      # Minimum confidence required for autonomous action
    "TIER_SENSITIVITY": ["ENTERPRISE"], # Tiers that always require approval for execution
    "RETRY_LIMIT": 3               # Max retries before escalation
}

# Risk Tier Definitions
RISK_TIERS = {
    "MINOR": {"penalty": 0.02, "escalate": False},
    "MAJOR": {"penalty": 0.05, "escalate": "PENDING_APPROVAL"},
    "CRITICAL": {"penalty": 0.15, "escalate": "HUMAN_HANDOFF"}
}

# Initial Trust Levels for Agents (0.0 to 1.0)
AGENT_TRUST_LEVELS = {
    "RiskAnalysisAgent": 0.95,
    "StrategyPlanningAgent": 0.90,
    "SimulationAgent": 0.85,
    "DecisionAgent": 0.80,
    "ActionAgent": 0.90,
    "GovernanceEngine": 1.0,
    "HumanHandoffAgent": 1.0,
    "FeedbackLearningAgent": 0.95
}

# Action Sensitivity Map
ACTION_SENSITIVITY = {
    "ESCALATION": 0.1,
    "EMAIL_TRIGGER": 0.3,
    "SMS_TRIGGER": 0.4,
    "apply_discount": 0.7,
    "BILLING_REFUND": 0.9,
    "SERVICE_TERMINATION": 1.0
}

