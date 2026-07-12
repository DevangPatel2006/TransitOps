const express = require('express');
const rateLimit = require('express-rate-limit');
const validate = require('../../utils/validators');
const { registerSchema, loginSchema } = require('./auth.validators');
const authController = require('./auth.controller');
const authenticate = require('../../middleware/authenticate');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per 15 minutes
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;
