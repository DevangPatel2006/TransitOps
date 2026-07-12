const asyncHandler = require('../../utils/asyncHandler');
const authService = require('./auth.service');

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json(user);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json(result);
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getUserById(req.user.user_id);
  res.status(200).json(user);
});

module.exports = {
  register,
  login,
  me,
};
