from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class ProductCreate(BaseModel):
    codigo_barra_sku: str = Field(min_length=1)
    nombre: str = Field(min_length=1)
    precio_compra: float = Field(ge=0)
    precio_venta: float = Field(ge=0)
    stock_actual: int = Field(ge=0)
    stock_minimo: int = Field(ge=0)

class ProductOut(ProductCreate):
    id: int
    class Config:
        from_attributes = True

class SupplierCreate(BaseModel):
    nombre_razon_social: str
    nit_ci: str
    telefono: str

class SupplierOut(SupplierCreate):
    id: int
    class Config:
        from_attributes = True

class PurchaseItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    unit_cost: float = Field(ge=0)

class PurchaseCreate(BaseModel):
    supplier_id: int
    items: List[PurchaseItemCreate]

class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)

class SaleCreate(BaseModel):
    items: List[SaleItemCreate]

class SaleOut(BaseModel):
    id: int
    created_at: datetime
    total_amount: float
    class Config:
        from_attributes = True