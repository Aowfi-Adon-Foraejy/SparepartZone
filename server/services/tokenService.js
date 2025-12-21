const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateTokens = async (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '10d' }
  );

  // Clean up old refresh tokens first
  await cleanExpiredTokens();

  // Get current user to manage tokens properly
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Remove old tokens and add new one
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  user.refreshTokens = user.refreshTokens.filter(token => 
    new Date(token.createdAt) > tenDaysAgo
  );
  
  // Add new refresh token
  user.refreshTokens.push({
    token: refreshToken,
    createdAt: new Date()
  });

  // Limit to maximum 5 refresh tokens
  if (user.refreshTokens.length > 5) {
    user.refreshTokens = user.refreshTokens.slice(-5);
  }

  await user.save();

  return { accessToken, refreshToken };
};

const verifyRefreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error('User not found');
    }

    const tokenExists = user.refreshTokens.find(rt => rt.token === refreshToken);

    if (!tokenExists) {
      throw new Error('Refresh token not found in user records');
    }

    return user;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token format');
    } else {
      throw new Error(error.message || 'Invalid refresh token');
    }
  }
};

const revokeRefreshToken = async (userId, refreshToken) => {
  await User.findByIdAndUpdate(userId, {
    $pull: {
      refreshTokens: { token: refreshToken }
    }
  });
};

const revokeAllRefreshTokens = async (userId) => {
  await User.findByIdAndUpdate(userId, {
    $set: { refreshTokens: [] }
  });
};

const cleanExpiredTokens = async () => {
  const users = await User.find({});
  
  for (const user of users) {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      
    // Filter out old tokens
    const validTokens = user.refreshTokens.filter(token => 
      new Date(token.createdAt) > tenDaysAgo
    );
    
    // Update if tokens were removed
    if (validTokens.length < user.refreshTokens.length) {
      user.refreshTokens = validTokens;
      await user.save();
    }
  }
};

module.exports = {
  generateTokens,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  cleanExpiredTokens
};