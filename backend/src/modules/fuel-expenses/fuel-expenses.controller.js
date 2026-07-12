const asyncHandler = require('../../utils/asyncHandler');
const fuelExpensesService = require('./fuel-expenses.service');

const getFuelLogs = asyncHandler(async (req, res) => {
  const logs = await fuelExpensesService.getFuelLogs(req.query);
  res.status(200).json(logs);
});

const createFuelLog = asyncHandler(async (req, res) => {
  const log = await fuelExpensesService.createFuelLog(req.body);
  res.status(201).json(log);
});

const getExpenses = asyncHandler(async (req, res) => {
  const list = await fuelExpensesService.getExpenses(req.query);
  res.status(200).json(list);
});

const createExpense = asyncHandler(async (req, res) => {
  const expense = await fuelExpensesService.createExpense(req.body);
  res.status(201).json(expense);
});

module.exports = {
  getFuelLogs,
  createFuelLog,
  getExpenses,
  createExpense,
};
