const asyncHandler = require("../utils/asyncHandler");
const dashboardService = require("../services/dashboard.service");

exports.GET_DASHBOARD = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboard({
    userId: req.user.id,
  });

  return res.status(200).json({
    success: true,
    message: "Dashboard fetched successfully.",
    data,
  });
});
