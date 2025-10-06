from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import Asset, User, AssetType
from ..schemas import AssetCreate, AssetResponse, AssetUpdate, MarketSummary
from ..auth import get_current_user

router = APIRouter()

@router.post("/", response_model=AssetResponse)
async def create_asset(
    asset_data: AssetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new precious asset"""
    # Create asset in database
    asset = Asset(
        owner_id=current_user.id,
        **asset_data.dict()
    )
    
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    
    return asset

@router.get("/", response_model=List[AssetResponse])
async def get_assets(
    asset_type: Optional[AssetType] = Query(None),
    owner_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get list of assets with optional filtering"""
    query = select(Asset)
    
    if asset_type:
        query = query.where(Asset.asset_type == asset_type)
    if owner_id:
        query = query.where(Asset.owner_id == owner_id)
    if is_active is not None:
        query = query.where(Asset.is_active == is_active)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    assets = result.scalars().all()
    
    return assets

@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific asset by ID"""
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    return asset

@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: str,
    asset_update: AssetUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an asset (only by owner)"""
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    if asset.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this asset"
        )
    
    # Update fields
    update_data = asset_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(asset, field, value)
    
    asset.last_price_update = datetime.utcnow()
    
    await db.commit()
    await db.refresh(asset)
    
    return asset

@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Deactivate an asset (soft delete)"""
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    if asset.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this asset"
        )
    
    asset.is_active = False
    await db.commit()
    
    return {"message": "Asset deactivated successfully"}

@router.get("/market/summary", response_model=MarketSummary)
async def get_market_summary(db: AsyncSession = Depends(get_db)):
    """Get market summary statistics"""
    # Get total assets
    total_assets_result = await db.execute(select(Asset).where(Asset.is_active == True))
    total_assets = len(total_assets_result.scalars().all())
    
    # Get total value
    total_value_result = await db.execute(
        select(Asset.current_price * Asset.weight).where(Asset.is_active == True)
    )
    total_value = sum(total_value_result.scalars().all()) or 0
    
    # Get active orders (placeholder - would need TradeOrder model)
    active_orders = 0  # TODO: Implement when TradeOrder is ready
    
    return MarketSummary(
        total_assets=total_assets,
        total_value=total_value,
        active_orders=active_orders,
        price_updates=0,  # TODO: Implement price update tracking
        last_updated=datetime.utcnow()
    )
