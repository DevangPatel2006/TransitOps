const express = require('express');
const validate = require('../../utils/validators');
const {
  createFuelLogSchema,
  queryFuelLogSchema,
  createExpenseSchema,
  queryExpenseSchema,
} = require('./fuel-expenses.validators');
const fuelExpensesController = require('./fuel-expenses.controller');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.use(authenticate);

router.post('/fuel-logs', requireRole('FLEET_MANAGER', 'FINANCIAL_ANALYST'), validate(createFuelLogSchema), fuelExpensesController.createFuelLog);
router.get('/fuel-logs', validate(queryFuelLogSchema), fuelExpensesController.getFuelLogs);

router.post('/expenses', requireRole('FLEET_MANAGER', 'FINANCIAL_ANALYST'), validate(createExpenseSchema), fuelExpensesController.createExpense);
router.get('/expenses', validate(queryExpenseSchema), fuelExpensesController.getExpenses);

module.exports = router;
