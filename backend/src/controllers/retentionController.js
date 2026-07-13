const { logger } = require('../utils/logger');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../utils/errors');

class RetentionController {
  constructor(retentionService, broadcast) {
    this.retentionService = retentionService;
    this.broadcast = broadcast;
    
    // Bind methods with catchAsync for centralized error handling
    this.predict = catchAsync(this.predict.bind(this));
    this.runAgent = catchAsync(this.runAgent.bind(this));
    this.simulate = catchAsync(this.simulate.bind(this));
    this.getMemory = catchAsync(this.getMemory.bind(this));
    this.executeAction = catchAsync(this.executeAction.bind(this));
    this.getKpis = catchAsync(this.getKpis.bind(this));
    this.claimEscalation = catchAsync(this.claimEscalation.bind(this));
    this.getClaimedEscalations = catchAsync(this.getClaimedEscalations.bind(this));
    this.getPendingEscalations = catchAsync(this.getPendingEscalations.bind(this));
    this.updateSettings = catchAsync(this.updateSettings.bind(this));
    this.addSpecialist = catchAsync(this.addSpecialist.bind(this));
    this.getSpecialists = catchAsync(this.getSpecialists.bind(this));
    this.addCaseNote = catchAsync(this.addCaseNote.bind(this));
  }

  async predict(req, res) {
    const startTime = Date.now();
    const { user_id } = req.body;
    
    const prediction = await this.retentionService.predictChurn(req.body);
    
    this.broadcast({
      type: 'CHURN_PREDICTION',
      payload: prediction
    });

    logger.info('Prediction completed successfully', {
      user_id,
      duration: Date.now() - startTime
    });

    res.json(prediction);
  }

  async runAgent(req, res) {
    const { user_id } = req.body;
    const result = await this.retentionService.runAgent(req.body);
    res.json(result);
  }

  async simulate(req, res) {
    const { user_id } = req.body;
    const result = await this.retentionService.simulate(req.body);
    this.broadcast({ type: 'SIMULATION_EVENT', payload: result });
    res.json(result);
  }

  async getMemory(req, res) {
    const { userId } = req.params;
    const memory = await this.retentionService.getMemory(userId);
    res.json(memory);
  }


  async claimEscalation(req, res) {
    const specialistId = req.user.username;
    const result = await this.retentionService.claimEscalation({
      ...req.body,
      specialist_id: specialistId
    });
    this.broadcast({ type: 'ESCALATION_CLAIMED', payload: { ...req.body, specialist_id: specialistId, ...result } });
    res.json(result);
  }

  async getClaimedEscalations(req, res) {
    const specialistId = req.user.username;
    const result = await this.retentionService.getClaimedEscalations(specialistId);
    res.json(result);
  }

  async getPendingEscalations(req, res) {
    const result = await this.retentionService.getPendingEscalations();
    res.json(result);
  }

  async getKpis(req, res) {
    const kpis = await this.retentionService.getKpis();
    res.json(kpis);
  }

  async updateSettings(req, res) {
    const adminId = req.user.username;
    const result = await this.retentionService.updateAdminSettings(req.body, adminId);
    res.json(result);
  }

  async addSpecialist(req, res) {
    const adminId = req.user.username;
    const result = await this.retentionService.addSpecialist(req.body, adminId);
    res.json(result);
  }

  async getSpecialists(req, res) {
    const result = await this.retentionService.getSpecialists();
    res.json(result);
  }

  async executeAction(req, res) {
    const specialistId = req.user.username;
    const result = await this.retentionService.executeAction({
      ...req.body,
      specialist_id: specialistId
    });
    this.broadcast({ 
      type: 'SPECIALIST_ACTION_EXECUTED', 
      payload: { ...result, escalation_id: req.body.escalation_id } 
    });
    res.json(result);
  }

  async addCaseNote(req, res) {
    const specialistId = req.user.username;
    const result = await this.retentionService.addCaseNote({
      ...req.body,
      specialist_id: specialistId
    });
    res.json(result);
  }


}

module.exports = RetentionController;
