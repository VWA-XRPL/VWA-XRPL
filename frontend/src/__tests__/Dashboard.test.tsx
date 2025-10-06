import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';

// Mock the API
jest.mock('../services/api', () => ({
  api: {
    get: jest.fn(),
  },
  endpoints: {
    assets: {
      marketSummary: '/api/assets/market/summary',
    },
    pricing: {
      getMarketPrices: '/api/pricing/market',
      getTrends: '/api/pricing/trends',
    },
  },
}));

// Mock the auth context
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  it('renders dashboard title', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome to VWA - Precious Asset Tokenization Platform')).toBeInTheDocument();
  });

  it('renders stats cards', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    expect(screen.getByText('Total Assets')).toBeInTheDocument();
    expect(screen.getByText('Total Value')).toBeInTheDocument();
    expect(screen.getByText('Active Orders')).toBeInTheDocument();
    expect(screen.getByText('Price Updates')).toBeInTheDocument();
  });

  it('renders quick actions', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Create Asset')).toBeInTheDocument();
    expect(screen.getByText('Start Trading')).toBeInTheDocument();
    expect(screen.getByText('View Portfolio')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    // Mock API to return pending promise
    const { api } = require('../services/api');
    api.get.mockImplementation(() => new Promise(() => {}));
    
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );
    
    // Should show loading skeletons
    expect(screen.getAllByTestId('loading-skeleton')).toHaveLength(4);
  });
});
