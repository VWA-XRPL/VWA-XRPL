from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class AssetType(str, Enum):
    GOLD = "gold"
    SILVER = "silver"
    PLATINUM = "platinum"
    PALLADIUM = "palladium"
    DIAMOND = "diamond"
    RUBY = "ruby"
    EMERALD = "emerald"
    SAPPHIRE = "sapphire"

class OrderType(str, Enum):
    BUY = "buy"
    SELL = "sell"

class OrderStatus(str, Enum):
    PENDING = "pending"
    FILLED = "filled"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

# User schemas
class UserBase(BaseModel):
    wallet_address: str
    username: Optional[str] = None
    email: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: str
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

# Asset schemas
class AssetBase(BaseModel):
    asset_type: AssetType
    weight: float = Field(..., gt=0, description="Weight in grams")
    purity: float = Field(..., ge=0, le=100, description="Purity percentage")
    certification: Optional[str] = None
    current_price: float = Field(..., gt=0, description="Current price in USD")

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    weight: Optional[float] = Field(None, gt=0)
    purity: Optional[float] = Field(None, ge=0, le=100)
    certification: Optional[str] = None
    current_price: Optional[float] = Field(None, gt=0)

class AssetResponse(AssetBase):
    id: str
    owner_id: str
    created_at: datetime
    last_price_update: Optional[datetime]
    is_active: bool
    mint_address: Optional[str]
    token_account: Optional[str]
    
    class Config:
        from_attributes = True

# Trade Order schemas
class TradeOrderBase(BaseModel):
    asset_id: str
    order_type: OrderType
    quantity: float = Field(..., gt=0)
    price_per_unit: float = Field(..., gt=0)

class TradeOrderCreate(TradeOrderBase):
    expires_at: Optional[datetime] = None

class TradeOrderUpdate(BaseModel):
    quantity: Optional[float] = Field(None, gt=0)
    price_per_unit: Optional[float] = Field(None, gt=0)
    status: Optional[OrderStatus] = None

class TradeOrderResponse(TradeOrderBase):
    id: str
    owner_id: str
    status: OrderStatus
    created_at: datetime
    updated_at: Optional[datetime]
    expires_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# Price History schemas
class PriceHistoryBase(BaseModel):
    price: float = Field(..., gt=0)
    source: Optional[str] = None

class PriceHistoryCreate(PriceHistoryBase):
    asset_id: str

class PriceHistoryResponse(PriceHistoryBase):
    id: str
    asset_id: str
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Transaction schemas
class TransactionBase(BaseModel):
    asset_id: str
    buyer_id: str
    seller_id: str
    quantity: float = Field(..., gt=0)
    price_per_unit: float = Field(..., gt=0)
    total_amount: float = Field(..., gt=0)
    transaction_hash: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Market data schemas
class MarketPrice(BaseModel):
    asset_type: AssetType
    price: float
    change_24h: Optional[float] = None
    volume_24h: Optional[float] = None
    last_updated: datetime

class MarketSummary(BaseModel):
    total_assets: int
    total_value: float
    active_orders: int
    price_updates: int
    last_updated: datetime
