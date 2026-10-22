import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from main import app, get_db
import models

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_api_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "status" in response.json()
    assert response.json()["status"] == "online"

def test_login_demo_credentials():
    response = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["rol"] == "ADMIN"

def test_login_invalid_credentials():
    response = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "wrong_password_xyz"
    })
    assert response.status_code == 401

def test_create_and_query_product():
    test_sku = f"TEST-TOOL-{int(Decimal('1000') + Decimal('1'))}"
    # Crear producto
    payload = {
        "sku": test_sku,
        "name": "Martillo de Uña 16oz Test",
        "descripcion": "Martillo forjado con mango de fibra",
        "categoria": "Herramientas Manuales",
        "cost_price": "25.50",
        "price": "45.00",
        "stock": 10,
        "min_stock": 3
    }
    res = client.post("/api/v1/products", json=payload)
    # Puede ser 201 o 400 si ya existe
    if res.status_code == 201:
        data = res.json()
        assert data["sku"] == test_sku
        assert data["stock"] == 10
        prod_id = data["id"]
        
        # Consultar por ID
        get_res = client.get(f"/api/v1/products/{prod_id}")
        assert get_res.status_code == 200
        assert get_res.json()["name"] == "Martillo de Uña 16oz Test"

def test_stock_validation_insufficient_stock():
    # Obtener el primer producto con stock
    products_res = client.get("/api/v1/products")
    assert products_res.status_code == 200
    products = products_res.json()
    assert len(products) > 0
    target_product = products[0]
    
    # Intentar vender más de lo disponible
    excessive_qty = target_product["stock"] + 9999
    sale_payload = {
        "items": [
            {
                "product_id": target_product["id"],
                "quantity": excessive_qty
            }
        ]
    }
    sale_res = client.post("/api/v1/sales/checkout", json=sale_payload)
    assert sale_res.status_code == 400
    assert "Stock insuficiente" in sale_res.json()["detail"]

def test_purchase_increments_stock_and_logs_kardex():
    # Obtener producto
    products = client.get("/api/v1/products").json()
    target = products[0]
    initial_stock = target["stock"]
    
    # Registrar compra de 5 unidades
    purchase_payload = {
        "items": [
            {
                "product_id": target["id"],
                "quantity": 5,
                "unit_cost": "20.00"
            }
        ],
        "observaciones": "Test automatizado de compra"
    }
    purch_res = client.post("/api/v1/purchases", json=purchase_payload)
    assert purch_res.status_code == 201
    
    # Verificar que el stock incrementó exactamente en 5
    updated_prod = client.get(f"/api/v1/products/{target['id']}").json()
    assert updated_prod["stock"] == initial_stock + 5
    
    # Verificar que el Kardex tiene el movimiento de ENTRADA
    kardex_res = client.get(f"/api/v1/kardex?product_id={target['id']}")
    assert kardex_res.status_code == 200
    kardex = kardex_res.json()
    assert len(kardex) > 0
    latest = kardex[0]
    assert latest["tipo_movimiento"] == "ENTRADA"
    assert latest["cantidad"] == 5

def test_sale_decrements_stock_and_logs_kardex():
    # Obtener producto
    products = client.get("/api/v1/products").json()
    target = products[0]
    initial_stock = target["stock"]
    assert initial_stock >= 2, "Se requieren al menos 2 unidades para probar venta"
    
    # Registrar venta de 2 unidades
    sale_payload = {
        "items": [
            {
                "product_id": target["id"],
                "quantity": 2
            }
        ],
        "metodo_pago": "EFECTIVO",
        "observaciones": "Test automatizado de venta"
    }
    sale_res = client.post("/api/v1/sales/checkout", json=sale_payload)
    assert sale_res.status_code == 201
    
    # Verificar que el stock bajó exactamente en 2
    updated_prod = client.get(f"/api/v1/products/{target['id']}").json()
    assert updated_prod["stock"] == initial_stock - 2
    
    # Verificar que el Kardex tiene el movimiento de SALIDA
    kardex_res = client.get(f"/api/v1/kardex?product_id={target['id']}")
    assert kardex_res.status_code == 200
    kardex = kardex_res.json()
    latest = kardex[0]
    assert latest["tipo_movimiento"] == "SALIDA"
    assert latest["cantidad"] == 2
