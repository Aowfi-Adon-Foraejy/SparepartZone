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

  await User.findByIdAndUpdate(userId, {
    $push: {
      refreshTokens: {
        token: refreshToken,
        createdAt: new Date()
      }
    }
  });

  return { accessToken, refreshToken };
};

const verifyRefreshToken = async (refreshToken) => {
  try {
    console.log('Verifying refresh token...');
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    console.log('Token decoded successfully, userId:', decoded.userId);
    
    const user = await User.findById(decoded.userId);
    console.log('User found:', !!user, 'Refresh tokens count:', user?.refreshTokens?.length || 0);

    if (!user) {
      console.log('User not found for refresh token');
      throw new Error('User not found');
    }

    const tokenExists = user.refreshTokens.find(rt => rt.token === refreshToken);
    console.log('Refresh token exists in user tokens:', !!tokenExists);

    if (!tokenExists) {
      console.log('Refresh token not found in user refresh tokens');
      throw new Error('Refresh token not found in user records');
    }

    return user;
  } catch (error) {
    console.error('Refresh token verification failed:', error.message);
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
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  await User.updateMany(
    {},
    {
      $pull: {
        refreshTokens: {
          createdAt: { $lt: tenDaysAgo }
        }
      }
    }
  );
};

module.exports = {
  generateTokens,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  cleanExpiredTokens
};