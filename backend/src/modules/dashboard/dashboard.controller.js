const asyncHandler = require('../../utils/asyncHandler');
const dashboardService = require('./dashboard.service');

const getKPIs = asyncHandler(async (req, res) => {
  const kpis = await dashboardService.getKPIs(req.query);
  res.status(200).json(kpis);
});

module.exports = {
  getKPIs,
};
//kpi