from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

# --- Esquemas de Autenticación / Usuario ---
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    rol: str

class UserCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    rol: str = Field("SELLER", pattern="^(ADMIN|SELLER|WAREHOUSE_MANAGER)$")

class UserOut(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    estado: bool
    created_at: datetime
    class Config:
        from_attributes = True

# --- Esquemas de Producto ---
class ProductBase(BaseModel):
    sku: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=150)
    descripcion: Optional[str] = None
    categoria: str = "Ferretería General"
    price: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))      # Precio de venta
    cost_price: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00")) # Precio de compra
    stock: int = Field(default=0, ge=0)
    min_stock: int = Field(default=5, ge=0)

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    price: Optional[Decimal] = Field(default=None, ge=Decimal("0.00"))
    cost_price: Optional[Decimal] = Field(default=None, ge=Decimal("0.00"))
    stock: Optional[int] = Field(default=None, ge=0)
    min_stock: Optional[int] = Field(default=None, ge=0)
    estado: Optional[bool] = None

class ProductOut(ProductBase):
    id: int
    estado: bool
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# --- Esquemas de Proveedores ---
class SupplierBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150)
    nit_ci: str = Field(..., min_length=1, max_length=50)
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None

class SupplierCreate(SupplierBase):
    nombre_razon_social: Optional[str] = None # Retrocompatibilidad

class SupplierOut(SupplierBase):
    id: int
    nombre_razon_social: Optional[str] = None
    estado: bool
    created_at: datetime
    class Config:
        from_attributes = True

# --- Esquemas de Clientes ---
class CustomerBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150)
    documento_nit: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerOut(CustomerBase):
    id: int
    estado: bool
    created_at: datetime
    class Config:
        from_attributes = True

# --- Esquemas de Compras (Entradas) ---
class PurchaseItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    unit_cost: Decimal = Field(..., ge=Decimal("0.00"))

class PurchaseItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_cost: Decimal
    subtotal: Decimal
    class Config:
        from_attributes = True

class PurchaseCreate(BaseModel):
    supplier_id: Optional[int] = None
    items: List[PurchaseItemCreate] = Field(..., min_length=1)
    observaciones: Optional[str] = None

class PurchaseOut(BaseModel):
    id: int
    supplier_id: Optional[int]
    created_at: datetime
    subtotal: Decimal
    total_amount: Decimal
    estado: str
    observaciones: Optional[str] = None
    items: List[PurchaseItemOut] = []
    class Config:
        from_attributes = True

# --- Esquemas de Ventas (Salidas / Checkout) ---
class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class SaleItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    class Config:
        from_attributes = True

class SaleCreate(BaseModel):
    customer_id: Optional[int] = None
    items: List[SaleItemCreate] = Field(..., min_length=1)
    descuento: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    metodo_pago: str = "EFECTIVO"
    observaciones: Optional[str] = None

class SaleOut(BaseModel):
    id: int
    customer_id: Optional[int]
    created_at: datetime
    subtotal: Decimal
    descuento: Decimal
    total_amount: Decimal
    metodo_pago: str
    estado: str
    observaciones: Optional[str] = None
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
    costo_unitario: Decimal
    referencia: Optional[str] = None
    motivo: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True
