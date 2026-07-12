const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const prisma = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Please authenticate');
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key-transitops-backend-dev');
    } catch (e) {
      throw new ApiError(401, 'Please authenticate');
    }

    const user = await prisma.user.findUnique({
      where: { user_id: payload.user_id },
      include: { role: true },
    });

    if (!user) {
      throw new ApiError(401, 'Please authenticate');
    }

    req.user = {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role.name,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
