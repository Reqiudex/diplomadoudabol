from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# --- Esquemas de Autenticación / Usuario ---
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    username: str
    rol: str

class UserCreate(BaseModel):
    nombre: str
    email: str
    password: str
    rol: str = "admin"

class UserOut(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    class Config:
        from_attributes = True

# --- Esquemas de Producto (Silos / Forrajes) ---
class ProductBase(BaseModel):
    sku: str
    name: str
    price: float
    stock: int = 0
    cost_price: float = 0.0
    min_stock: int = 5

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    cost_price: Optional[float] = None
    min_stock: Optional[int] = None

class ProductOut(ProductBase):
    id: int
    class Config:
        from_attributes = True

# --- Esquemas de Proveedores / Clientes ---
class SupplierBase(BaseModel):
    nombre_razon_social: str
    nit_ci: str
    telefono: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierOut(SupplierBase):
    id: int
    class Config:
        from_attributes = True

# --- Esquemas de Compras (Entrada de Granos / Silos) ---
class PurchaseItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    unit_cost: float = Field(ge=0)

class PurchaseItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_cost: float
    class Config:
        from_attributes = True

class PurchaseCreate(BaseModel):
    supplier_id: Optional[int] = None
    items: List[PurchaseItemCreate]

class PurchaseOut(BaseModel):
    id: int
    supplier_id: Optional[int]
    created_at: datetime
    total_amount: float
    items: List[PurchaseItemOut] = []
    class Config:
        from_attributes = True

# --- Esquemas de Venta (Salidas a Productores / Ganaderos) ---
class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)

class SaleItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    class Config:
        from_attributes = True

class SaleCreate(BaseModel):
    items: List[SaleItemCreate]

class SaleOut(BaseModel):
    id: int
    created_at: datetime
    total_amount: float
    items: List[SaleItemOut] = []
    class Config:
        from_attributes = True

# --- Esquemas de Kardex / Trazabilidad ---
class KardexOut(BaseModel):
    id: int
    product_id: int
    tipo_movimiento: str
    cantidad: int
    stock_anterior: int
    stock_nuevo: int
    costo_unitario: float
    referencia: Optional[str] = None
    motivo: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True
