const axios = require('axios');
const config = require('../config');
const { logger } = require('../utils/logger');
const { AppError } = require('../utils/errors');

// Agent Permission Scopes - Tool-Level + Impact-Level
const AGENT_PERMISSIONS = {
  'RiskAnalysisAgent': {
    allowed: ['ANALYZE_RISK', 'FETCH_CUSTOMER_DATA'],
    blocked: ['EXECUTE_DISCOUNT', 'MODIFY_CONTRACTS'],
    thresholds: {}
  },
  'StrategyPlanningAgent': {
    allowed: ['GENERATE_STRATEGIES', 'EVALUATE_ROI'],
    blocked: ['EXECUTE_DISCOUNT'],
    thresholds: {}
  },
  'SimulationAgent': {
    allowed: ['RUN_SIMULATIONS', 'ANALYZE_SCENARIOS'],
    blocked: ['EXECUTE_DISCOUNTS', 'TRIGGER_CRM_ACTIONS'],
    thresholds: {}
  },
  'DecisionAgent': {
    allowed: ['RANK_STRATEGIES', 'SELECT_OPTIMAL_PATH', 'VALIDATE_WORKFLOWS', 'BLOCK_UNSAFE_ACTIONS', 'EXECUTE_APPROVED_RETENTION_WORKFLOWS'],
    blocked: ['BYPASS_GOVERNANCE_VALIDATION'],
    thresholds: {
      'execute_approved_retention_workflows': { max_value: 500, requires_approval_for: ['ENTERPRISE'] }
    }
  },
  'ActionAgent': {
    allowed: ['EXECUTE_APPROVED_RETENTION_WORKFLOWS', 'SEND_OFFERS'],
    blocked: ['BYPASS_GOVERNANCE_VALIDATION'],
    thresholds: {
      'execute_approved_retention_workflows': { max_value: 500, requires_approval_for: ['ENTERPRISE'] }
    }
  },
  'GovernanceEngine': {
    allowed: ['VALIDATE_WORKFLOWS', 'BLOCK_UNSAFE_ACTIONS', 'TRIGGER_ESCALATION'],
    blocked: [],
    thresholds: {}
  },
  'HumanHandoffAgent': {
    allowed: ['ESCALATE_CASE', 'CREATE_TASK'],
    blocked: [],
    thresholds: {}
  },
  'FeedbackLearningAgent': {
    allowed: ['ANALYZE_FEEDBACK', 'UPDATE_MODEL_PARAMETERS'],
    blocked: ['MODIFY_LIVE_POLICIES'],
    thresholds: {}
  }
};

class RetentionService {
  constructor(cache, repository) {
    this.cache = cache;
    this.repository = repository;
  }

  async predictChurn(userData) {
    const { user_id, usage, complaints, payment_delay } = userData;
    
    try {
      const response = await axios.post(`${config.services.prediction}/predict`, {
        user_id,
        usage_score: usage,
        complaints_count: complaints,
        payment_delay_count: payment_delay
      });

      const { churn_risk, risk_level } = response.data;

      await this.repository.createChurnPrediction({
        user_id,
        usage_score: usage,
        complaints_count: complaints,
        payment_delay_count: payment_delay,
        churn_risk,
        risk_level
      });

      await this.cache.del('kpis');
      await this.cache.invalidatePattern('audit-logs:*');

      // Automated pipeline execution trigger for High and Critical risks (Option A)
      if (risk_level === 'High' || risk_level === 'Critical') {
        // Fire-and-forget background execution to avoid blocking the fast prediction response
        (async () => {
          try {
            // Deduplication Check
            const activeAction = await this.repository.getActiveRetentionAction(user_id);
            if (activeAction) {
              logger.info(`Active retention action already exists for user ${user_id}. Skipping automatic trigger.`, {
                user_id,
                action_id: activeAction.id,
                status: activeAction.status
              });
              return;
            }

            logger.info(`Automatically triggering retention pipeline for user ${user_id} due to ${risk_level} risk level.`);

            const pipelineResponse = await axios.post(`${config.services.agenticAi}/api/run-pipeline`, {
              userId: user_id,
              plan_tier: userData.plan_tier || 'Gold',
              usage_score: typeof usage === 'number' ? usage : 15.0,
              complaints_count: typeof complaints === 'number' ? complaints : 0,
              network_drops: typeof userData.network_drops === 'number' ? userData.network_drops : 0,
              payment_status: userData.payment_status || 'Paid'
            });

            const pipelineData = pipelineResponse.data;
            logger.info('Retention pipeline automated execution completed successfully', {
              user_id,
              pipelineData
            });

            // Broadcast real-time notifications to React dashboard
            if (this.broadcast) {
              if (pipelineData.escalated_to_human) {
                this.broadcast({
                  type: 'SPECIALIST_ESCALATION',
                  payload: {
                    user_id,
                    risk_score: pipelineData.risk_score,
                    risk_level: pipelineData.risk_level,
                    reason: pipelineData.decision_reasoning,
                    action_id: pipelineData.specialist_queue_id
                  }
                });
              } else {
                this.broadcast({
                  type: 'AGENT_DECISION',
                  payload: {
                    user_id,
                    risk_score: pipelineData.risk_score,
                    risk_level: pipelineData.risk_level,
                    selected_strategy: pipelineData.selected_strategy,
                    final_action: pipelineData.final_action,
                    reason: pipelineData.decision_reasoning
                  }
                });
              }
            }
          } catch (pipelineError) {
            logger.error('Error executing automated pipeline trigger', {
              error: pipelineError.message,
              user_id
            });

            try {
              // Option A Graceful Degradation: Log FAILED_AUTO_TRIGGER in database
              const failedAction = await this.repository.createRetentionAction(
                user_id,
                'FAILED_AUTO_TRIGGER',
                'pending'
              );

              // Log systemic failure inside agent_memory
              await this.repository.createAgentMemory({
                user_id,
                action: 'AUTO_TRIGGER_FAILURE',
                result: 'error',
                churn_risk: churn_risk,
                expected_churn: churn_risk,
                reason: `Failed to trigger LangGraph pipeline automatically. Error: ${pipelineError.message}. Manual recovery required.`
              });

              // Broadcast websocket notification for manual fallback trigger
              if (this.broadcast) {
                this.broadcast({
                  type: 'PIPELINE_TRIGGER_FAILED',
                  payload: {
                    user_id,
                    error: pipelineError.message,
                    action_id: failedAction.id,
                    message: `Pipeline failed to trigger automatically for high-risk user ${user_id}. A manual trigger option has been queued.`
                  }
                });
              }
            } catch (dbError) {
              logger.error('Failed to log auto-trigger failure to database', {
                error: dbError.message,
                user_id
              });
            }
          }
        })();
      }

      return { user_id, churn_risk, risk_level, confidence: 0.85 };
    } catch (error) {
      logger.error('Error in predictChurn service', { error: error.message, user_id });
      throw new AppError('Churn prediction failed', 500);
    }
  }

  /**
   * Hybrid Validation Layer: Tool-Level + Impact-Level
   */
  async validatePermission(agentName, action, metadata = {}) {
    logger.info(`[GovernanceEngine] Hybrid Validation Request`, { agentName, action });

    const policy = AGENT_PERMISSIONS[agentName];
    if (!policy) {
      await this.logSecurityEvent(agentName, action, 'DENIED', 'CRITICAL', 'Unknown agent policy');
      return { allowed: false, status: 'DENIED', tier: 'CRITICAL', reason: 'Unknown agent policy' };
    }

    // 1. Tool Check
    const isAllowed = policy.allowed.includes(action.toUpperCase());
    const isBlocked = policy.blocked.includes(action.toUpperCase());

    if (isBlocked) {
      await this.logSecurityEvent(agentName, action, 'DENIED', 'CRITICAL', 'Explicitly Blocked');
      return { allowed: false, status: 'DENIED', tier: 'CRITICAL', reason: 'Explicitly Blocked' };
    }

    if (!isAllowed) {
      await this.logSecurityEvent(agentName, action, 'DENIED', 'MINOR', 'Unauthorized Action');
      return { allowed: false, status: 'DENIED', tier: 'MINOR', reason: 'Unauthorized Action' };
    }

    // 2. Impact Check
    const threshold = policy.thresholds[action.toLowerCase()];
    if (threshold) {
      if (metadata.amount && threshold.max_value && metadata.amount > threshold.max_value) {
        await this.logSecurityEvent(agentName, action, 'PAUSED', 'MAJOR', `Impact limit exceeded ($${metadata.amount})`);
        return { allowed: false, status: 'PAUSED', tier: 'MAJOR', reason: 'Financial threshold exceeded' };
      }
      
      if (metadata.tier && threshold.requires_approval_for && threshold.requires_approval_for.includes(metadata.tier)) {
        await this.logSecurityEvent(agentName, action, 'PAUSED', 'MAJOR', `Tier sensitivity protection (${metadata.tier})`);
        return { allowed: false, status: 'PAUSED', tier: 'MAJOR', reason: 'High-tier customer sensitivity' };
      }
    }

    return { allowed: true, status: 'ALLOWED' };
  }

  async logSecurityEvent(agentName, action, status, tier, reason, metadata = {}) {
    logger.warn(`[GovernanceEngine] SECURITY_EVENT:${status}`, { agentName, action, tier, reason });

    // Persist Trust Decay Event
    const penaltyMap = { 'MINOR': 0.02, 'MAJOR': 0.05, 'CRITICAL': 0.15 };
    if (status === 'DENIED') {
      const penalty = penaltyMap[tier] || 0.05;
      await this.repository.logTrustEvent(agentName, 'TRUST_DECAY', penalty, reason);
    }

    // Admin Audit
    await this.repository.createAdminAuditLog({
      action: `SECURITY_${status}`,
      reason: `[${tier}] Agent: ${agentName} | Action: ${action} | Reason: ${reason}`,
      admin_id: 'SYSTEM_GOVERNANCE'
    });

    if (this.broadcast) {
      this.broadcast({
        type: 'SECURITY_EVENT',
        payload: { agent: agentName, action, status, tier, reason, timestamp: new Date() }
      });
    }
  }


  async runAgent(userData) {
    const { user_id, usage, complaints, payment_delay, agent_name = 'ActionAgent' } = userData;

    // Enforcement Layer Check
    const permission = await this.validatePermission(agent_name, 'EXECUTE_WORKFLOW');
    if (!permission.allowed) {
      throw new AppError(`Security Violation: ${permission.reason}`, 403);
    }

    try {
      const response = await axios.post(`${config.services.agent}/agent`, {
        user_id,
        usage_score: usage,
        complaints_count: complaints,
        payment_delay_count: payment_delay
      });

      const result = response.data;

      await this.repository.createAgentMemory({
        user_id,
        action: result.best_action,
        result: 'executed',
        churn_risk: result.churn_risk,
        expected_churn: result.expected_churn,
        reason: result.reason
      });

      await this.cache.del('kpis');
      await this.cache.del(`memory:${user_id}`);
      await this.cache.invalidatePattern('audit-logs:*');

      return result;
    } catch (error) {
      logger.error('Error in runAgent service', { error: error.message, user_id });
      throw new AppError('Agent execution failed', 500);
    }
  }

  async simulate(simulationData) {
    const { agent_name = 'SimulationAgent' } = simulationData;

    // Enforcement Layer Check
    const permission = await this.validatePermission(agent_name, 'RUN_SIMULATION');
    if (!permission.allowed) {
      throw new AppError(`Security Violation: ${permission.reason}`, 403);
    }

    try {
      const response = await axios.post(`${config.services.simulation}/simulate`, simulationData);
      return response.data;
    } catch (error) {
      logger.error('Simulation service error', { error: error.message });
      throw new AppError('Simulation failed', 500);
    }
  }

  async getMemory(userId) {
    const cacheKey = `memory:${userId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const rows = await this.repository.getMemoryByUserId(userId);
    const response = { user_id: userId, memory: rows, count: rows.length };

    await this.cache.set(cacheKey, response, 300);
    return response;
  }


  async claimEscalation(claimData) {
    const { escalation_id, user_id, specialist_id, specialist_name, churn_risk } = claimData;
    
    await this.repository.upsertUser(user_id);
    
    // Transition the existing escalation from pending to claimed
    const action = await this.repository.updateRetentionActionStatus(
      escalation_id,
      'claimed',
      `CLAIMED_BY:${specialist_id}`
    );

    await this.repository.createAgentMemory({
      user_id,
      action: 'HUMAN_INTERVENTION',
      result: 'claimed',
      churn_risk,
      expected_churn: churn_risk * 0.5,
      reason: `Claimed by ${specialist_name}`
    });

    return {
      status: 'success',
      claimed_at: action.executed_at,
      action_id: action.id
    };
  }

  async getClaimedEscalations(specialist_id) {
    const rows = await this.repository.getClaimedEscalations(specialist_id);
    return { claimed: rows, count: rows.length };
  }

  async getPendingEscalations() {
    const rows = await this.repository.getPendingEscalations();
    return { pending: rows, count: rows.length };
  }

  async getKpis() {
    const cacheKey = 'kpis';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const today = new Date().toISOString().split('T')[0];
    const data = await this.repository.getKpiData(today);

    const result = {
      interventions_today: parseInt(data.interventionsToday) || 0,
      total_processed: parseInt(data.totalProcessed) || 0,
      churn_prevented: (parseFloat(data.avgImprovement || 0) * 100).toFixed(1) + '%',
      active_users: parseInt(data.activeUsersCount) || 0,
      distribution: data.distributionData.map(r => ({ name: r.action, value: parseInt(r.count) }))
    };

    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  async updateAdminSettings(settings, adminId) {
    const reason = `Admin settings updated: ${Object.keys(settings).join(', ')}`;
    await this.repository.createAdminAuditLog({
      action: 'ADMIN_SETTING_CHANGE',
      reason,
      admin_id: adminId
    });
    
    await this.cache.del('kpis');
    await this.cache.invalidatePattern('audit-logs:*');
    
    return { status: 'success', message: 'Settings updated and logged' };
  }

  async addSpecialist(specialistData, adminId) {
    const { username, role, specialty } = specialistData;
    await this.repository.createAdminAuditLog({
      action: 'SPECIALIST_ADDED',
      reason: `${username} (${role}) - ${specialty}`,
      admin_id: adminId
    });

    await this.cache.invalidatePattern('audit-logs:*');
    
    return { status: 'success', message: `Specialist ${username} added to registry` };
  }

  async getSpecialists() {
    const specialists = await this.repository.getSpecialists();
    return { specialists, count: specialists.length };
  }

  async executeAction(actionData) {
    const { user_id, action, specialist_id, escalation_id } = actionData;
    
    logger.info('Executing manual specialist action', { user_id, action, specialist_id, escalation_id });

    // 1. Record the action in agent_memory for audit trail and KPI calculation
    await this.repository.createAgentMemory({
      user_id,
      action: `SPECIALIST_${action}`,
      result: 'executed',
      churn_risk: 0, // Manual intervention usually targets 0 risk if successful
      expected_churn: 0,
      reason: `Manual intervention by specialist ${specialist_id}`
    });

    // 2. If this action is part of a claimed escalation, resolve it
    if (escalation_id) {
      await this.repository.resolveRetentionAction(escalation_id, `Resolved via ${action} by ${specialist_id}`);
    }

    // 3. Clear caches
    await this.cache.del('kpis');
    await this.cache.invalidatePattern('audit-logs:*');

    return {
      status: 'success',
      user_id,
      action,
      timestamp: new Date().toISOString()
    };
  }

  async addCaseNote(noteData) {
    const { user_id, specialist_id, note } = noteData;
    await this.repository.addSpecialistNote(user_id, specialist_id, note);
    await this.cache.invalidatePattern('audit-logs:*');
    return { status: 'success', message: 'Note added' };
  }



}

module.exports = RetentionService;
