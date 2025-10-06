from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from datetime import datetime, timedelta

from ..database import get_db
from ..models import TradeOrder, Asset, User, OrderType, OrderStatus
from ..schemas import TradeOrderCreate, TradeOrderResponse, TradeOrderUpdate, TransactionResponse
from ..auth import get_current_user

router = APIRouter()

@router.post("/orders", response_model=TradeOrderResponse)
async def create_trade_order(
    order_data: TradeOrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new trade order"""
    # Verify asset exists and is active
    result = await db.execute(select(Asset).where(Asset.id == order_data.asset_id))
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    if not asset.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset is not active"
        )
    
    # Create trade order
    order = TradeOrder(
        owner_id=current_user.id,
        **order_data.dict()
    )
    
    db.add(order)
    await db.commit()
    await db.refresh(order)
    
    return order

@router.get("/orders", response_model=List[TradeOrderResponse])
async def get_trade_orders(
    asset_id: Optional[str] = Query(None),
    order_type: Optional[OrderType] = Query(None),
    status: Optional[OrderStatus] = Query(None),
    owner_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get trade orders with optional filtering"""
    query = select(TradeOrder)
    
    if asset_id:
        query = query.where(TradeOrder.asset_id == asset_id)
    if order_type:
        query = query.where(TradeOrder.order_type == order_type)
    if status:
        query = query.where(TradeOrder.status == status)
    if owner_id:
        query = query.where(TradeOrder.owner_id == owner_id)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    return orders

@router.get("/orders/{order_id}", response_model=TradeOrderResponse)
async def get_trade_order(
    order_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific trade order by ID"""
    result = await db.execute(select(TradeOrder).where(TradeOrder.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade order not found"
        )
    
    return order

@router.put("/orders/{order_id}", response_model=TradeOrderResponse)
async def update_trade_order(
    order_id: str,
    order_update: TradeOrderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a trade order (only by owner)"""
    result = await db.execute(select(TradeOrder).where(TradeOrder.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade order not found"
        )
    
    if order.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this order"
        )
    
    if order.status != OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update pending orders"
        )
    
    # Update fields
    update_data = order_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(order, field, value)
    
    await db.commit()
    await db.refresh(order)
    
    return order

@router.delete("/orders/{order_id}")
async def cancel_trade_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel a trade order"""
    result = await db.execute(select(TradeOrder).where(TradeOrder.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade order not found"
        )
    
    if order.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this order"
        )
    
    if order.status != OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel pending orders"
        )
    
    order.status = OrderStatus.CANCELLED
    await db.commit()
    
    return {"message": "Trade order cancelled successfully"}

@router.post("/orders/{order_id}/execute")
async def execute_trade_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Execute a trade order (simplified version)"""
    result = await db.execute(select(TradeOrder).where(TradeOrder.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade order not found"
        )
    
    if order.status != OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is not pending"
        )
    
    if order.owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot execute your own order"
        )
    
    # Mark order as filled
    order.status = OrderStatus.FILLED
    
    # TODO: Implement actual token transfer logic here
    # This would involve calling the Solana program
    
    await db.commit()
    
    return {"message": "Trade executed successfully"}
