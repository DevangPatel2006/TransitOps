const express = require('express');
const { z } = require('zod');
const validate = require('../../utils/validators');
const notificationsController = require('./notifications.controller');
const authenticate = require('../../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

const querySchema = z.object({
  query: z.object({
    days: z.string().regex(/^\d+$/).transform(Number).default('30'),
  }),
});

router.get('/expiring-licenses', validate(querySchema), notificationsController.getExpiringLicenses);
router.post('/expiring-licenses/check', notificationsController.triggerCheck);

module.exports = router;
