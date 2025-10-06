from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
import uuid

Base = declarative_base()

class AssetType(str, PyEnum):
    GOLD = "gold"
    SILVER = "silver"
    PLATINUM = "platinum"
    PALLADIUM = "palladium"
    DIAMOND = "diamond"
    RUBY = "ruby"
    EMERALD = "emerald"
    SAPPHIRE = "sapphire"

class OrderType(str, PyEnum):
    BUY = "buy"
    SELL = "sell"

class OrderStatus(str, PyEnum):
    PENDING = "pending"
    FILLED = "filled"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    wallet_address = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=True)
    email = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships
    assets = relationship("Asset", back_populates="owner")
    trade_orders = relationship("TradeOrder", back_populates="owner")

class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    asset_type = Column(Enum(AssetType), nullable=False)
    weight = Column(Float, nullable=False)  # in grams
    purity = Column(Float, nullable=False)  # percentage (0-100)
    certification = Column(Text, nullable=True)
    current_price = Column(Float, nullable=False)  # in USD
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_price_update = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    
    # Solana specific
    mint_address = Column(String, unique=True, nullable=True)
    token_account = Column(String, nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="assets")
    trade_orders = relationship("TradeOrder", back_populates="asset")
    price_history = relationship("PriceHistory", back_populates="asset")

class TradeOrder(Base):
    __tablename__ = "trade_orders"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    asset_id = Column(String, ForeignKey("assets.id"), nullable=False)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    order_type = Column(Enum(OrderType), nullable=False)
    quantity = Column(Float, nullable=False)
    price_per_unit = Column(Float, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    asset = relationship("Asset", back_populates="trade_orders")
    owner = relationship("User", back_populates="trade_orders")

class PriceHistory(Base):
    __tablename__ = "price_history"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    asset_id = Column(String, ForeignKey("assets.id"), nullable=False)
    price = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    source = Column(String, nullable=True)  # e.g., "api", "manual", "oracle"
    
    # Relationships
    asset = relationship("Asset", back_populates="price_history")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    asset_id = Column(String, ForeignKey("assets.id"), nullable=False)
    buyer_id = Column(String, ForeignKey("users.id"), nullable=False)
    seller_id = Column(String, ForeignKey("users.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    price_per_unit = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    transaction_hash = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    asset = relationship("Asset")
    buyer = relationship("User", foreign_keys=[buyer_id])
    seller = relationship("User", foreign_keys=[seller_id])
