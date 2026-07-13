const express = require('express');
const router = express.Router();

const { validate, retentionSchemas } = require('../middleware/validator');
const auth = require('../middleware/auth.middleware');

module.exports = (controller) => {
  // Public routes (require valid token)
  router.post('/predict', auth.protect, validate(retentionSchemas.predict), controller.predict);
  router.post('/agent', auth.protect, validate(retentionSchemas.agent), controller.runAgent);
  router.post('/simulate', auth.protect, validate(retentionSchemas.simulate), controller.simulate);
  router.get('/memory/:userId', auth.protect, controller.getMemory);
  router.get('/kpis', auth.protect, controller.getKpis);
  router.post('/action', auth.protect, validate(retentionSchemas.executeAction), controller.executeAction);
  

  router.post('/escalations/claim', auth.protect, validate(retentionSchemas.claimEscalation), controller.claimEscalation);
  router.get('/escalations/claimed', auth.protect, controller.getClaimedEscalations);
  router.get('/escalations/pending', auth.protect, controller.getPendingEscalations);
  router.post('/escalations/note', auth.protect, controller.addCaseNote);
  
  // Admin routes (require admin role)
  router.post('/admin/settings', auth.protect, auth.restrictTo('admin'), validate(retentionSchemas.adminSettings), controller.updateSettings);
  router.post('/admin/specialists', auth.protect, auth.restrictTo('admin'), validate(retentionSchemas.addSpecialist), controller.addSpecialist);
  router.get('/admin/specialists', auth.protect, auth.restrictTo('admin'), controller.getSpecialists);
  


  return router;
};
