import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '../services/api';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter,
  Plus,
  Eye,
  Clock,
  DollarSign
} from 'lucide-react';

interface TradeOrder {
  id: string;
  asset_id: string;
  order_type: 'buy' | 'sell';
  quantity: number;
  price_per_unit: number;
  status: 'pending' | 'filled' | 'cancelled' | 'expired';
  created_at: string;
  expires_at?: string;
}

interface Asset {
  id: string;
  asset_type: string;
  weight: number;
  current_price: number;
}

const Trading: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'create'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderType, setOrderType] = useState<'buy' | 'sell' | ''>('');
  const queryClient = useQueryClient();

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['trade-orders', searchTerm, orderType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (orderType) params.append('order_type', orderType);
      return api.get(`${endpoints.trades.getOrders}?${params}`).then(res => res.data);
    },
  });

  const { data: assets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.get(endpoints.assets.getAll).then(res => res.data),
  });

  const createOrderMutation = useMutation({
    mutationFn: (orderData: any) => api.post(endpoints.trades.createOrder, orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-orders'] });
      setActiveTab('orders');
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (orderId: string) => api.delete(endpoints.trades.cancelOrder(orderId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-orders'] });
    },
  });

  const executeOrderMutation = useMutation({
    mutationFn: (orderId: string) => api.post(endpoints.trades.executeOrder(orderId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-orders'] });
    },
  });

  const handleCreateOrder = (orderData: any) => {
    createOrderMutation.mutate(orderData);
  };

  const handleCancelOrder = (orderId: string) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      cancelOrderMutation.mutate(orderId);
    }
  };

  const handleExecuteOrder = (orderId: string) => {
    if (window.confirm('Are you sure you want to execute this order?')) {
      executeOrderMutation.mutate(orderId);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'filled':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAssetById = (assetId: string) => {
    return assets?.find((asset: Asset) => asset.id === assetId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trading</h1>
          <p className="mt-2 text-gray-600">
            Buy and sell precious assets on the marketplace
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'orders'
                ? 'border-gold-500 text-gold-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Market Orders
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-gold-500 text-gold-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Create Order
          </button>
        </nav>
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10 w-full"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as 'buy' | 'sell' | '')}
                  className="input w-full"
                >
                  <option value="">All Types</option>
                  <option value="buy">Buy Orders</option>
                  <option value="sell">Sell Orders</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders List */}
          {ordersLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {orders?.map((order: TradeOrder) => {
                const asset = getAssetById(order.asset_id);
                return (
                  <div key={order.id} className="card p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`flex items-center space-x-1 ${
                            order.order_type === 'buy' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {order.order_type === 'buy' ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            <span className="font-medium capitalize">
                              {order.order_type} Order
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Asset</p>
                            <p className="font-medium text-gray-900 capitalize">
                              {asset?.asset_type || 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Quantity</p>
                            <p className="font-medium text-gray-900">
                              {order.quantity}g
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Price per Unit</p>
                            <p className="font-medium text-gray-900">
                              {formatPrice(order.price_per_unit)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">
                            <p>Total: {formatPrice(order.quantity * order.price_per_unit)}</p>
                            <p>Created: {new Date(order.created_at).toLocaleDateString()}</p>
                            {order.expires_at && (
                              <p>Expires: {new Date(order.expires_at).toLocaleDateString()}</p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            {order.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleExecuteOrder(order.id)}
                                  className="btn btn-primary text-sm"
                                >
                                  Execute
                                </button>
                                <button
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="btn btn-secondary text-sm"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            <button className="btn btn-secondary text-sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {orders?.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || orderType 
                  ? 'Try adjusting your search criteria'
                  : 'No trading orders available at the moment'
                }
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Order
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <CreateOrderForm
          assets={assets || []}
          onSubmit={handleCreateOrder}
          isLoading={createOrderMutation.isPending}
        />
      )}
    </div>
  );
};

// Create Order Form Component
const CreateOrderForm: React.FC<{
  assets: Asset[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}> = ({ assets, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    asset_id: '',
    order_type: 'buy' as 'buy' | 'sell',
    quantity: '',
    price_per_unit: '',
    expires_at: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      quantity: parseFloat(formData.quantity),
      price_per_unit: parseFloat(formData.price_per_unit),
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
    });
  };

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Trading Order</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asset
            </label>
            <select
              value={formData.asset_id}
              onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
              className="input w-full"
              required
            >
              <option value="">Select an asset</option>
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.asset_type.charAt(0).toUpperCase() + asset.asset_type.slice(1)} 
                  - {asset.weight}g - {formatPrice(asset.current_price)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Type
            </label>
            <select
              value={formData.order_type}
              onChange={(e) => setFormData({ ...formData, order_type: e.target.value as 'buy' | 'sell' })}
              className="input w-full"
              required
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity (grams)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price per Unit (USD)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.price_per_unit}
              onChange={(e) => setFormData({ ...formData, price_per_unit: e.target.value })}
              className="input w-full"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expires At (optional)
            </label>
            <input
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              className="input w-full"
            />
          </div>
        </div>

        {formData.quantity && formData.price_per_unit && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Order Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Quantity:</span>
                <span className="ml-2 font-medium">{formData.quantity}g</span>
              </div>
              <div>
                <span className="text-gray-600">Price per Unit:</span>
                <span className="ml-2 font-medium">{formatPrice(parseFloat(formData.price_per_unit) || 0)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Total Value:</span>
                <span className="ml-2 font-medium text-lg">
                  {formatPrice((parseFloat(formData.quantity) || 0) * (parseFloat(formData.price_per_unit) || 0))}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Order...' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
};

export default Trading;
