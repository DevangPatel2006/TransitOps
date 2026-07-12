const asyncHandler = require('../../utils/asyncHandler');
const notificationsService = require('./notifications.service');

const getExpiringLicenses = asyncHandler(async (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 30;
  const list = await notificationsService.getExpiringLicenses(days);
  res.status(200).json(list);
});

const triggerCheck = asyncHandler(async (req, res) => {
  const result = await notificationsService.triggerCheck();
  res.status(200).json(result);
});

module.exports = {
  getExpiringLicenses,
  triggerCheck,
};
