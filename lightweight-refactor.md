# Lightweight Refactor Plan

## Goal
Make the Sentient-Retention Engine lightweight by removing Prometheus, Grafana, and NGINX containers, and consolidating the LangGraph workflow's active agents, while keeping the Digital Twin simulation sandbox, human handoff, and feedback learning loop.

## Tasks
- [x] Task 1: Prune docker-compose.yml services ➔ Verify: Run `docker-compose config` to ensure it parses without syntax errors and has only postgres, redis, backend, ml-service, and frontend.
- [x] Task 2: Refactor agents/core/nodes/strategy_nodes.py (`node_decision`) to handle strategy selection, governance checking, and simulated execution ➔ Verify: File compiles successfully.
- [x] Task 3: Update agents/core/nodes/__init__.py and agents/core/workflow.py to construct the revised workflow graph: START ➔ risk_analysis ➔ strategy_planning ➔ simulation ➔ decision ➔ (approved ? feedback_learning : human_handoff ➔ feedback_learning) ➔ END ➔ Verify: `python agents/core/workflow.py` executes without errors.
- [x] Task 4: Update agents/api/ai_api.py to stream node events correctly for the revised workflow graph ➔ Verify: Uvicorn server starts successfully.
- [x] Task 5: Align backend/src/services/retentionService.js permissions ➔ Verify: Node server starts up without errors.
- [x] Task 6: Run full pre-flight checklist validator ➔ Verify: `python .agent/scripts/checklist.py .` returns success (core checks pass).

## Done When
- [x] Docker Compose has only 5 services (postgres, redis, backend, ml-service, frontend) and runs cleanly.
- [x] LangGraph executes the simplified pipeline with decision agent governance + execution.
- [x] Human handoff and feedback learning nodes execute correctly and log database events.
- [x] The React UI displays the trace updates and handles human escalations correctly.
- [x] Core checklist validations return successful.

## Notes
- We keep PostgreSQL and scikit-learn ML service as-is per the user's constraints.
- `human_handoff` and `feedback_learning` are retained as nodes in the workflow to support human specialist review and model learning/analytics.
