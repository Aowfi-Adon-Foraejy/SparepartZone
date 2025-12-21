// Enhanced token management and error handling
export const tokenManager = {
  // Check if token is expired
  isTokenExpired: (token) => {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true; // If we can't parse, consider it expired
    }
  },

  // Get time until expiry
  getTimeUntilExpiry: (token) => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const timeLeft = payload.exp * 1000 - Date.now();
      if (timeLeft <= 0) return 'expired';
      
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      return `${hours}h ${minutes}m ${seconds}s`;
    } catch {
      return 'unknown';
    }
  },

  // Refresh token before expiry
  shouldRefreshToken: (token) => {
    const timeLeft = tokenManager.getTimeUntilExpiry(token);
    if (!timeLeft || timeLeft === 'expired') return false;
    
    // Refresh if less than 5 minutes left
    const [minutes] = timeLeft.match(/(\d+)h/);
    const timeInMinutes = minutes ? parseInt(minutes[1]) : 0;
    
    return timeInMinutes < 5;
  },

  // Setup automatic token refresh
  setupAutoRefresh: (refreshCallback, interval = 4 * 60 * 1000) => {
    setInterval(async () => {
      const token = localStorage.getItem('accessToken');
      if (token && tokenManager.shouldRefreshToken(token)) {
        console.log('Auto-refreshing token...');
        try {
          await refreshCallback();
        } catch (error) {
          console.error('Auto refresh failed:', error);
        }
      }
    }, interval);
  }
};