import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '../services/api';
import { 
  Briefcase, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Gem,
  Activity,
  PieChart,
  BarChart3
} from 'lucide-react';

interface PortfolioAsset {
  id: string;
  asset_type: string;
  weight: number;
  purity: number;
  current_price: number;
  created_at: string;
  is_active: boolean;
}

interface PortfolioStats {
  total_assets: number;
  total_value: number;
  active_orders: number;
  price_updates: number;
}

const Portfolio: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['portfolio-assets'],
    queryFn: () => api.get(endpoints.assets.getAll).then(res => res.data),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['portfolio-stats'],
    queryFn: () => api.get(endpoints.assets.marketSummary).then(res => res.data),
  });

  const { data: priceHistory } = useQuery({
    queryKey: ['portfolio-price-history', timeRange],
    queryFn: () => api.get(endpoints.pricing.getTrends).then(res => res.data),
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatWeight = (weight: number) => {
    return `${weight}g`;
  };

  const getAssetIcon = (assetType: string) => {
    const iconMap: { [key: string]: string } = {
      gold: '🥇',
      silver: '🥈',
      platinum: '🏆',
      palladium: '💎',
      diamond: '💎',
      ruby: '💎',
      emerald: '💎',
      sapphire: '💎',
    };
    return iconMap[assetType] || '💎';
  };

  const getAssetTypeColor = (assetType: string) => {
    const colorMap: { [key: string]: string } = {
      gold: 'text-gold-600 bg-gold-100',
      silver: 'text-silver-600 bg-silver-100',
      platinum: 'text-purple-600 bg-purple-100',
      palladium: 'text-blue-600 bg-blue-100',
      diamond: 'text-pink-600 bg-pink-100',
      ruby: 'text-red-600 bg-red-100',
      emerald: 'text-green-600 bg-green-100',
      sapphire: 'text-indigo-600 bg-indigo-100',
    };
    return colorMap[assetType] || 'text-gray-600 bg-gray-100';
  };

  const calculateTotalValue = () => {
    if (!assets) return 0;
    return assets.reduce((total: number, asset: PortfolioAsset) => 
      total + (asset.current_price * asset.weight), 0
    );
  };

  const calculateAssetTypeDistribution = () => {
    if (!assets) return {};
    return assets.reduce((acc: { [key: string]: number }, asset: PortfolioAsset) => {
      const value = asset.current_price * asset.weight;
      acc[asset.asset_type] = (acc[asset.asset_type] || 0) + value;
      return acc;
    }, {});
  };

  const getTopPerformingAsset = () => {
    if (!assets || assets.length === 0) return null;
    return assets.reduce((top: PortfolioAsset, asset: PortfolioAsset) => 
      (asset.current_price * asset.weight) > (top.current_price * top.weight) ? asset : top
    );
  };

  if (assetsLoading || statsLoading) {
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

  const totalValue = calculateTotalValue();
  const assetDistribution = calculateAssetTypeDistribution();
  const topAsset = getTopPerformingAsset();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
          <p className="mt-2 text-gray-600">
            Overview of your precious asset holdings
          </p>
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <PieChart className="w-4 h-4 mr-2" />
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            List
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(totalValue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-gold-500" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-sm font-medium text-green-600">+12.5%</span>
            <span className="text-sm text-gray-500 ml-1">this month</span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">{assets?.length || 0}</p>
            </div>
            <Gem className="w-8 h-8 text-gold-500" />
          </div>
          <div className="mt-4 flex items-center">
            <Activity className="w-4 h-4 text-blue-500 mr-1" />
            <span className="text-sm font-medium text-blue-600">+3</span>
            <span className="text-sm text-gray-500 ml-1">this month</span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.active_orders || 0}</p>
            </div>
            <Briefcase className="w-8 h-8 text-gold-500" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            <span className="text-sm font-medium text-red-600">-2</span>
            <span className="text-sm text-gray-500 ml-1">this week</span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Price Updates</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.price_updates || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-gold-500" />
          </div>
          <div className="mt-4 flex items-center">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-sm font-medium text-green-600">+8</span>
            <span className="text-sm text-gray-500 ml-1">today</span>
          </div>
        </div>
      </div>

      {/* Asset Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Distribution</h3>
          <div className="space-y-3">
            {Object.entries(assetDistribution).map(([type, value]) => {
              const percentage = (value / totalValue) * 100;
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getAssetTypeColor(type).split(' ')[1]}`}></div>
                    <span className="font-medium text-gray-900 capitalize">{type}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatPrice(value)}</p>
                    <p className="text-sm text-gray-500">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Asset</h3>
          {topAsset ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{getAssetIcon(topAsset.asset_type)}</div>
                <div>
                  <h4 className="font-semibold text-gray-900 capitalize">
                    {topAsset.asset_type}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {formatWeight(topAsset.weight)} • {topAsset.purity}% purity
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Current Price</span>
                  <span className="font-medium">{formatPrice(topAsset.current_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Value</span>
                  <span className="font-semibold text-lg">
                    {formatPrice(topAsset.current_price * topAsset.weight)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Added</span>
                  <span className="text-sm text-gray-900">
                    {new Date(topAsset.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No assets in portfolio</p>
          )}
        </div>
      </div>

      {/* Assets List/Grid */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Your Assets</h3>
          <div className="flex space-x-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
              className="input w-32"
            >
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
              <option value="90d">90 Days</option>
            </select>
          </div>
        </div>

        {assets?.length === 0 ? (
          <div className="text-center py-12">
            <Gem className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assets in portfolio</h3>
            <p className="text-gray-500 mb-4">
              Start building your portfolio by creating your first asset
            </p>
            <button className="btn btn-primary">
              Create Asset
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
          }>
            {assets?.map((asset: PortfolioAsset) => (
              <div key={asset.id} className={`${viewMode === 'list' ? 'flex items-center justify-between p-4 border rounded-lg' : 'p-4 border rounded-lg'}`}>
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{getAssetIcon(asset.asset_type)}</div>
                  <div>
                    <h4 className="font-semibold text-gray-900 capitalize">
                      {asset.asset_type}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {formatWeight(asset.weight)} • {asset.purity}% purity
                    </p>
                  </div>
                </div>
                
                <div className={`${viewMode === 'list' ? 'text-right' : 'mt-4 space-y-2'}`}>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Price</span>
                    <span className="font-medium">{formatPrice(asset.current_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Value</span>
                    <span className="font-semibold">{formatPrice(asset.current_price * asset.weight)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      asset.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {asset.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
