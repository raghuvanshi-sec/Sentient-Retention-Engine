const Joi = require('joi');

const validationSchemas = {
  simulate: Joi.object({
    user_id: Joi.string().required(),
    plan_tier: Joi.string(),
    usage_score: Joi.number(),
    complaints_count: Joi.number(),
    network_drops: Joi.number(),
    payment_status: Joi.string()
  }),
  claimEscalation: Joi.object({
    escalation_id: Joi.string().required(),
    user_id: Joi.string().required(),
    specialist_id: Joi.string().required(),
    specialist_name: Joi.string().required(),
    churn_risk: Joi.number()
  }),
  adminSettings: Joi.object({
    model_version: Joi.string(),
    retention_threshold: Joi.number(),
    auto_escalation: Joi.boolean(),
    region: Joi.string()
  }),
  addSpecialist: Joi.object({
    username: Joi.string().required(),
    role: Joi.string().required(),
    specialty: Joi.string().required(),
    status: Joi.string().default('offline')
  }),
  predict: Joi.object({
    user_id: Joi.string().required(),
    usage: Joi.number(),
    complaints: Joi.number(),
    payment_delay: Joi.number()
  }),
  agent: Joi.object({
    user_id: Joi.string().required(),
    context: Joi.object()
  }),
  executeAction: Joi.object({
    user_id: Joi.string().required(),
    action: Joi.string().required(),
    escalation_id: Joi.string().optional(),
    parameters: Joi.object()
  })
};

module.exports = validationSchemas;
