from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(50), default="admin", nullable=False) # 'admin', 'vendedor', 'almacenero'

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True, nullable=False) # Ej: SILO-MAIZ-BOLSON, SILO-SORGO-TN
    name = Column(String(150), nullable=False)
    price = Column(Float, nullable=False) # Precio de venta (Bs. o USD)
    stock = Column(Integer, default=0, nullable=False) # Stock actual (Toneladas / Bolsas)
    cost_price = Column(Float, default=0.0, nullable=False) # Precio de compra / producción
    min_stock = Column(Integer, default=5, nullable=False) # Stock mínimo de alerta

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    nombre_razon_social = Column(String(150), nullable=False)
    nit_ci = Column(String(50), unique=True, nullable=False)
    telefono = Column(String(50), nullable=True)

class Purchase(Base):
    __tablename__ = "purchases"
    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    total_amount = Column(Float, nullable=False)
    
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")
    supplier = relationship("Supplier")

class PurchaseItem(Base):
    __tablename__ = "purchase_items"
    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False)

    purchase = relationship("Purchase", back_populates="items")
    product = relationship("Product")

class Sale(Base):
    __tablename__ = "sales"
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    total_amount = Column(Float, nullable=False)
    
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")

class SaleItem(Base):
    __tablename__ = "sale_items"
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product")

class KardexMovement(Base):
    __tablename__ = "kardex_movements"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    tipo_movimiento = Column(String(30), nullable=False) # 'ENTRADA' (Compra), 'SALIDA' (Venta), 'AJUSTE'
    cantidad = Column(Integer, nullable=False)
    stock_anterior = Column(Integer, nullable=False)
    stock_nuevo = Column(Integer, nullable=False)
    costo_unitario = Column(Float, default=0.0, nullable=False)
    referencia = Column(String(100), nullable=True) # Ej: "Compra #1", "Venta #4"
    motivo = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    product = relationship("Product")
