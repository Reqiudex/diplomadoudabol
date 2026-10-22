import os
import bcrypt
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import (
    Column, Integer, String, Numeric, ForeignKey, DateTime, Text, Boolean, Enum
)
from sqlalchemy.orm import relationship
from database import Base

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8')[:72], hashed_password.encode('utf-8'))
    except Exception:
        return False

# 1. TABLA: users (ADMIN, SELLER, WAREHOUSE_MANAGER)
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(50), default="SELLER", nullable=False) # 'ADMIN', 'SELLER', 'WAREHOUSE_MANAGER'
    estado = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

# 2. TABLA: products
class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=True)
    categoria = Column(String(100), default="Ferretería General", nullable=False)
    cost_price = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False) # Precio de compra
    price = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)      # Precio de venta
    stock = Column(Integer, default=0, nullable=False)                          # Stock actual
    min_stock = Column(Integer, default=5, nullable=False)                      # Stock mínimo
    estado = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

# 3. TABLA: suppliers (Proveedores)
class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    nombre_razon_social = Column(String(150), nullable=True) # Compatibilidad con código previo
    nit_ci = Column(String(50), unique=True, nullable=False)
    telefono = Column(String(50), nullable=True)
    email = Column(String(150), nullable=True)
    direccion = Column(String(255), nullable=True)
    estado = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

# 4. TABLA: customers (Clientes)
class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    documento_nit = Column(String(50), unique=True, nullable=True)
    telefono = Column(String(50), nullable=True)
    email = Column(String(150), nullable=True)
    direccion = Column(String(255), nullable=True)
    estado = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

# 5. TABLA: purchases (Compras)
class Purchase(Base):
    __tablename__ = "purchases"
    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    subtotal = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_amount = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    estado = Column(String(50), default="COMPLETADA", nullable=False)
    observaciones = Column(Text, nullable=True)
    
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")
    supplier = relationship("Supplier")
    user = relationship("User")

# 6. TABLA: purchase_items (Detalle de Compras)
class PurchaseItem(Base):
    __tablename__ = "purchase_items"
    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(12, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    purchase = relationship("Purchase", back_populates="items")
    product = relationship("Product")

# 7. TABLA: sales (Ventas)
class Sale(Base):
    __tablename__ = "sales"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    subtotal = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    descuento = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_amount = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    metodo_pago = Column(String(50), default="EFECTIVO", nullable=False) # EFECTIVO, QR, TARJETA, TRANSFERENCIA
    estado = Column(String(50), default="COMPLETADA", nullable=False)
    observaciones = Column(Text, nullable=True)
    
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    customer = relationship("Customer")
    user = relationship("User")

# 8. TABLA: sale_items (Detalle de Ventas)
class SaleItem(Base):
    __tablename__ = "sale_items"
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product")

# 9. TABLA: inventory_movements / kardex_movements
class KardexMovement(Base):
    __tablename__ = "kardex_movements"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    tipo_movimiento = Column(String(30), nullable=False) # 'ENTRADA', 'SALIDA', 'AJUSTE'
    cantidad = Column(Integer, nullable=False)
    stock_anterior = Column(Integer, nullable=False)
    stock_nuevo = Column(Integer, nullable=False)
    costo_unitario = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    referencia = Column(String(100), nullable=True) # Ej: "Compra #1", "Venta #4", "Ajuste manual"
    motivo = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    product = relationship("Product")
    user = relationship("User")
