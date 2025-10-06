import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const walletAddress = localStorage.getItem('walletAddress');
    if (walletAddress) {
      config.headers.Authorization = `Bearer ${walletAddress}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('walletAddress');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Users
  users: {
    create: '/api/users/',
    getMe: '/api/users/me',
    getUser: (id: string) => `/api/users/${id}`,
    getUsers: '/api/users/',
  },
  
  // Assets
  assets: {
    create: '/api/assets/',
    getAll: '/api/assets/',
    getById: (id: string) => `/api/assets/${id}`,
    update: (id: string) => `/api/assets/${id}`,
    delete: (id: string) => `/api/assets/${id}`,
    marketSummary: '/api/assets/market/summary',
  },
  
  // Trades
  trades: {
    createOrder: '/api/trades/orders',
    getOrders: '/api/trades/orders',
    getOrder: (id: string) => `/api/trades/orders/${id}`,
    updateOrder: (id: string) => `/api/trades/orders/${id}`,
    cancelOrder: (id: string) => `/api/trades/orders/${id}`,
    executeOrder: (id: string) => `/api/trades/orders/${id}/execute`,
  },
  
  // Pricing
  pricing: {
    getMarketPrices: '/api/pricing/market',
    getAssetPrice: (assetType: string) => `/api/pricing/market/${assetType}`,
    createPriceHistory: '/api/pricing/history',
    getPriceHistory: (assetId: string) => `/api/pricing/history/${assetId}`,
    updateAllPrices: '/api/pricing/update-prices',
    getTrends: '/api/pricing/trends',
  },
};

export default api;
