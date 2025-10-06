from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from datetime import datetime, timedelta
import httpx
import asyncio

from ..database import get_db
from ..models import Asset, PriceHistory, AssetType
from ..schemas import MarketPrice, PriceHistoryResponse, PriceHistoryCreate
from ..auth import get_current_user

router = APIRouter()

# Mock pricing data - in production, this would come from real APIs
MOCK_PRICES = {
    AssetType.GOLD: 2000.0,
    AssetType.SILVER: 25.0,
    AssetType.PLATINUM: 1000.0,
    AssetType.PALLADIUM: 2000.0,
    AssetType.DIAMOND: 5000.0,
    AssetType.RUBY: 1000.0,
    AssetType.EMERALD: 800.0,
    AssetType.SAPPHIRE: 600.0,
}

@router.get("/market", response_model=List[MarketPrice])
async def get_market_prices():
    """Get current market prices for all asset types"""
    current_time = datetime.utcnow()
    
    prices = []
    for asset_type, price in MOCK_PRICES.items():
        # Simulate some price variation
        variation = (hash(str(current_time)) % 100 - 50) / 1000  # ±5% variation
        current_price = price * (1 + variation)
        
        prices.append(MarketPrice(
            asset_type=asset_type,
            price=round(current_price, 2),
            change_24h=round(variation * 100, 2),
            volume_24h=1000.0,  # Mock volume
            last_updated=current_time
        ))
    
    return prices

@router.get("/market/{asset_type}", response_model=MarketPrice)
async def get_asset_price(asset_type: AssetType):
    """Get current market price for a specific asset type"""
    if asset_type not in MOCK_PRICES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset type not found"
        )
    
    current_time = datetime.utcnow()
    base_price = MOCK_PRICES[asset_type]
    variation = (hash(str(current_time)) % 100 - 50) / 1000
    current_price = base_price * (1 + variation)
    
    return MarketPrice(
        asset_type=asset_type,
        price=round(current_price, 2),
        change_24h=round(variation * 100, 2),
        volume_24h=1000.0,
        last_updated=current_time
    )

@router.post("/history", response_model=PriceHistoryResponse)
async def create_price_history(
    price_data: PriceHistoryCreate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new price history entry"""
    # Verify asset exists
    result = await db.execute(select(Asset).where(Asset.id == price_data.asset_id))
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    # Create price history entry
    price_history = PriceHistory(**price_data.dict())
    db.add(price_history)
    
    # Update asset current price
    asset.current_price = price_data.price
    asset.last_price_update = datetime.utcnow()
    
    await db.commit()
    await db.refresh(price_history)
    
    return price_history

@router.get("/history/{asset_id}", response_model=List[PriceHistoryResponse])
async def get_price_history(
    asset_id: str,
    days: int = Query(30, ge=1, le=365),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get price history for an asset"""
    # Verify asset exists
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get price history
    query = select(PriceHistory).where(
        PriceHistory.asset_id == asset_id,
        PriceHistory.timestamp >= start_date,
        PriceHistory.timestamp <= end_date
    ).order_by(desc(PriceHistory.timestamp))
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    price_history = result.scalars().all()
    
    return price_history

@router.post("/update-prices")
async def update_all_prices(db: AsyncSession = Depends(get_db)):
    """Update prices for all assets based on market data"""
    # Get all active assets
    result = await db.execute(select(Asset).where(Asset.is_active == True))
    assets = result.scalars().all()
    
    updated_count = 0
    current_time = datetime.utcnow()
    
    for asset in assets:
        if asset.asset_type in MOCK_PRICES:
            # Get current market price
            base_price = MOCK_PRICES[asset.asset_type]
            variation = (hash(str(current_time) + asset.id) % 100 - 50) / 1000
            new_price = base_price * (1 + variation)
            
            # Update asset price
            asset.current_price = round(new_price, 2)
            asset.last_price_update = current_time
            
            # Create price history entry
            price_history = PriceHistory(
                asset_id=asset.id,
                price=round(new_price, 2),
                source="api_update"
            )
            db.add(price_history)
            
            updated_count += 1
    
    await db.commit()
    
    return {
        "message": f"Updated prices for {updated_count} assets",
        "updated_count": updated_count,
        "timestamp": current_time
    }

@router.get("/trends")
async def get_price_trends(
    asset_type: Optional[AssetType] = Query(None),
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db)
):
    """Get price trends and analytics"""
    # This would typically involve more complex analytics
    # For now, return a simple summary
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    query = select(PriceHistory).where(
        PriceHistory.timestamp >= start_date,
        PriceHistory.timestamp <= end_date
    )
    
    if asset_type:
        # Join with Asset table to filter by asset_type
        query = query.join(Asset).where(Asset.asset_type == asset_type)
    
    result = await db.execute(query)
    price_entries = result.scalars().all()
    
    if not price_entries:
        return {
            "trend": "stable",
            "change_percent": 0.0,
            "volatility": 0.0,
            "data_points": 0
        }
    
    prices = [entry.price for entry in price_entries]
    first_price = prices[0]
    last_price = prices[-1]
    change_percent = ((last_price - first_price) / first_price) * 100
    
    # Calculate volatility (standard deviation)
    mean_price = sum(prices) / len(prices)
    variance = sum((price - mean_price) ** 2 for price in prices) / len(prices)
    volatility = (variance ** 0.5) / mean_price * 100
    
    trend = "up" if change_percent > 1 else "down" if change_percent < -1 else "stable"
    
    return {
        "trend": trend,
        "change_percent": round(change_percent, 2),
        "volatility": round(volatility, 2),
        "data_points": len(prices),
        "first_price": first_price,
        "last_price": last_price
    }
