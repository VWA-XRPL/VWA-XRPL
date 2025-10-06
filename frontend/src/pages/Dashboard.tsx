import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '../services/api';
import { 
  TrendingUp, 
  Gem, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { data: marketSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['market-summary'],
    queryFn: () => api.get(endpoints.assets.marketSummary).then(res => res.data),
  });

  const { data: marketPrices, isLoading: pricesLoading } = useQuery({
    queryKey: ['market-prices'],
    queryFn: () => api.get(endpoints.pricing.getMarketPrices).then(res => res.data),
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['price-trends'],
    queryFn: () => api.get(endpoints.pricing.getTrends).then(res => res.data),
  });

  const stats = [
    {
      name: 'Total Assets',
      value: marketSummary?.total_assets || 0,
      icon: Gem,
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      name: 'Total Value',
      value: `$${(marketSummary?.total_value || 0).toLocaleString()}`,
      icon: DollarSign,
      change: '+8.2%',
      changeType: 'positive' as const,
    },
    {
      name: 'Active Orders',
      value: marketSummary?.active_orders || 0,
      icon: Activity,
      change: '+23%',
      changeType: 'positive' as const,
    },
    {
      name: 'Price Updates',
      value: marketSummary?.price_updates || 0,
      icon: TrendingUp,
      change: '-2.1%',
      changeType: 'negative' as const,
    },
  ];

  const topAssets = marketPrices?.slice(0, 5) || [];

  if (summaryLoading || pricesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to VWA - Precious Asset Tokenization Platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <Icon className="w-8 h-8 text-gold-500" />
              </div>
              <div className="mt-4 flex items-center">
                {stat.changeType === 'positive' ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-1">from last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Assets */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Assets by Price</h3>
          <div className="space-y-4">
            {topAssets.map((asset, index) => (
              <div key={asset.asset_type} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gold-100 rounded-full flex items-center justify-center">
                    <Gem className="w-4 h-4 text-gold-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 capitalize">
                      {asset.asset_type}
                    </p>
                    <p className="text-sm text-gray-500">
                      {asset.change_24h > 0 ? '+' : ''}{asset.change_24h}% 24h
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    ${asset.price.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Vol: {asset.volume_24h?.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Trends */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Trends</h3>
          {trendsLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : trends ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Overall Trend</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  trends.trend === 'up' 
                    ? 'bg-green-100 text-green-800' 
                    : trends.trend === 'down'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {trends.trend}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Change (7d)</span>
                <span className={`font-medium ${
                  trends.change_percent > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trends.change_percent > 0 ? '+' : ''}{trends.change_percent}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Volatility</span>
                <span className="font-medium text-gray-900">
                  {trends.volatility}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Data Points</span>
                <span className="font-medium text-gray-900">
                  {trends.data_points}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No trend data available</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn btn-primary p-4 text-left">
            <Gem className="w-5 h-5 mb-2" />
            <div>
              <p className="font-medium">Create Asset</p>
              <p className="text-sm opacity-90">Tokenize your precious assets</p>
            </div>
          </button>
          <button className="btn btn-secondary p-4 text-left">
            <TrendingUp className="w-5 h-5 mb-2" />
            <div>
              <p className="font-medium">Start Trading</p>
              <p className="text-sm opacity-90">Buy or sell assets</p>
            </div>
          </button>
          <button className="btn btn-secondary p-4 text-left">
            <Activity className="w-5 h-5 mb-2" />
            <div>
              <p className="font-medium">View Portfolio</p>
              <p className="text-sm opacity-90">Check your holdings</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
