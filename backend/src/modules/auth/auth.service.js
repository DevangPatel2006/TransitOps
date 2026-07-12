const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');

const register = async (userData) => {
  const { full_name, email, password, role, role_id } = userData;

  // Check duplicate email
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ApiError(409, 'Email already registered');
  }

  // Find role
  let dbRole;
  if (role_id) {
    dbRole = await prisma.role.findUnique({ where: { role_id } });
  } else if (role) {
    dbRole = await prisma.role.findUnique({ where: { name: role } });
  }

  if (!dbRole) {
    throw new ApiError(400, 'Invalid role specified');
  }

  // Hash password with bcrypt cost 12
  const password_hash = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      full_name,
      email,
      password_hash,
      role_id: dbRole.role_id,
    },
    include: {
      role: true,
    },
  });

  // Exclude password_hash
  const { password_hash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

const login = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, 'Incorrect email or password');
  }

  const token = jwt.sign(
    { user_id: user.user_id, role: user.role.name },
    process.env.JWT_SECRET || 'super-secret-key-transitops-backend-dev',
    { expiresIn: '2h' }
  );

  const { password_hash: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
};

const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    include: { role: true },
  });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  const { password_hash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

module.exports = {
  register,
  login,
  getUserById,
};
