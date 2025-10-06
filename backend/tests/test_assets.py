import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.testclient import TestClient

from src.main import app
from src.database import get_db
from src.models import Asset, User, AssetType

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
async def db_session():
    # This would be set up with a test database
    pass

@pytest.fixture
async def test_user(db_session: AsyncSession):
    user = User(
        wallet_address="test_wallet_123",
        username="test_user"
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def test_asset(db_session: AsyncSession, test_user: User):
    asset = Asset(
        owner_id=test_user.id,
        asset_type=AssetType.GOLD,
        weight=10.5,
        purity=99.9,
        current_price=2000.0,
        certification="Test certification"
    )
    db_session.add(asset)
    await db_session.commit()
    await db_session.refresh(asset)
    return asset

class TestAssets:
    async def test_create_asset(self, client: TestClient, test_user: User):
        """Test creating a new asset"""
        asset_data = {
            "asset_type": "gold",
            "weight": 10.5,
            "purity": 99.9,
            "current_price": 2000.0,
            "certification": "Test certification"
        }
        
        response = client.post(
            "/api/assets/",
            json=asset_data,
            headers={"Authorization": f"Bearer {test_user.wallet_address}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["asset_type"] == "gold"
        assert data["weight"] == 10.5
        assert data["purity"] == 99.9
        assert data["current_price"] == 2000.0

    async def test_get_assets(self, client: TestClient):
        """Test getting list of assets"""
        response = client.get("/api/assets/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_asset_by_id(self, client: TestClient, test_asset: Asset):
        """Test getting a specific asset by ID"""
        response = client.get(f"/api/assets/{test_asset.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_asset.id)
        assert data["asset_type"] == "gold"

    async def test_update_asset(self, client: TestClient, test_asset: Asset, test_user: User):
        """Test updating an asset"""
        update_data = {
            "current_price": 2100.0,
            "weight": 11.0
        }
        
        response = client.put(
            f"/api/assets/{test_asset.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {test_user.wallet_address}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["current_price"] == 2100.0
        assert data["weight"] == 11.0

    async def test_delete_asset(self, client: TestClient, test_asset: Asset, test_user: User):
        """Test deleting an asset"""
        response = client.delete(
            f"/api/assets/{test_asset.id}",
            headers={"Authorization": f"Bearer {test_user.wallet_address}"}
        )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Asset deactivated successfully"

    async def test_get_market_summary(self, client: TestClient):
        """Test getting market summary"""
        response = client.get("/api/assets/market/summary")
        assert response.status_code == 200
        data = response.json()
        assert "total_assets" in data
        assert "total_value" in data
        assert "active_orders" in data
        assert "price_updates" in data

class TestPricing:
    async def test_get_market_prices(self, client: TestClient):
        """Test getting market prices"""
        response = client.get("/api/pricing/market")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    async def test_get_asset_price(self, client: TestClient):
        """Test getting price for specific asset type"""
        response = client.get("/api/pricing/market/gold")
        assert response.status_code == 200
        data = response.json()
        assert data["asset_type"] == "gold"
        assert "price" in data

    async def test_create_price_history(self, client: TestClient, test_asset: Asset, test_user: User):
        """Test creating price history entry"""
        price_data = {
            "asset_id": str(test_asset.id),
            "price": 2050.0,
            "source": "test"
        }
        
        response = client.post(
            "/api/pricing/history",
            json=price_data,
            headers={"Authorization": f"Bearer {test_user.wallet_address}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["price"] == 2050.0
        assert data["asset_id"] == str(test_asset.id)

    async def test_get_price_history(self, client: TestClient, test_asset: Asset):
        """Test getting price history for an asset"""
        response = client.get(f"/api/pricing/history/{test_asset.id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_update_all_prices(self, client: TestClient, test_user: User):
        """Test updating all asset prices"""
        response = client.post(
            "/api/pricing/update-prices",
            headers={"Authorization": f"Bearer {test_user.wallet_address}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "updated_count" in data

    async def test_get_price_trends(self, client: TestClient):
        """Test getting price trends"""
        response = client.get("/api/pricing/trends")
        assert response.status_code == 200
        data = response.json()
        assert "trend" in data
        assert "change_percent" in data
        assert "volatility" in data

class TestTrades:
    async def test_create_trade_order(self, client: TestClient, test_asset: Asset, test_user: User):
        """Test creating a trade order"""
        order_data = {
            "asset_id": str(test_asset.id),
            "order_type": "buy",
            "quantity": 5.0,
            "price_per_unit": 2000.0
        }
        
        response = client.post(
            "/api/trades/orders",
            json=order_data,
            headers={"Authorization": f"Bearer {test_user.wallet_address}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["order_type"] == "buy"
        assert data["quantity"] == 5.0
        assert data["price_per_unit"] == 2000.0

    async def test_get_trade_orders(self, client: TestClient):
        """Test getting trade orders"""
        response = client.get("/api/trades/orders")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_cancel_trade_order(self, client: TestClient, test_user: User):
        """Test canceling a trade order"""
        # First create an order
        order_data = {
            "asset_id": "test_asset_id",
            "order_type": "buy",
            "quantity": 5.0,
            "price_per_unit": 2000.0
        }
        
        create_response = client.post(
            "/api/trades/orders",
            json=order_data,
            headers={"Authorization": f"Bearer {test_user.wallet_address}"}
        )
        
        if create_response.status_code == 200:
            order_id = create_response.json()["id"]
            
            # Then cancel it
            response = client.delete(
                f"/api/trades/orders/{order_id}",
                headers={"Authorization": f"Bearer {test_user.wallet_address}"}
            )
            
            assert response.status_code == 200
            assert response.json()["message"] == "Trade order cancelled successfully"

class TestUsers:
    async def test_create_user(self, client: TestClient):
        """Test creating a new user"""
        user_data = {
            "wallet_address": "new_wallet_123",
            "username": "new_user"
        }
        
        response = client.post("/api/users/", json=user_data)
        assert response.status_code == 200
        data = response.json()
        assert data["wallet_address"] == "new_wallet_123"
        assert data["username"] == "new_user"

    async def test_get_users(self, client: TestClient):
        """Test getting list of users"""
        response = client.get("/api/users/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_get_user_by_id(self, client: TestClient, test_user: User):
        """Test getting user by ID"""
        response = client.get(f"/api/users/{test_user.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_user.id)
        assert data["wallet_address"] == test_user.wallet_address

if __name__ == "__main__":
    pytest.main([__file__])
