import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import jwt
from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

import models
import schemas
from database import engine, get_db

load_dotenv()

# Sincroniza y crea tablas en Supabase PostgreSQL
models.Base.metadata.create_all(bind=engine)

SECRET_KEY = os.getenv("SECRET_KEY", "clave_secreta_demo_cambiar_en_produccion")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

app = FastAPI(
    title="Ensilados Santa Cruz - API",
    version="1.0.0",
    description="Sistema de Compra, Venta, Inventario Estricto y Kardex de Auditoría para Ensilados y Forrajes (FastAPI + Supabase PostgreSQL).",
)

# CORS optimizado y seguro para dominios de producción Cloudflare y entornos locales
origins = [
    "https://ensilados.cherry.lat",
    "http://ensilados.cherry.lat",
    "https://ensiladosapi.cherry.lat",
    "http://ensiladosapi.cherry.lat",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@app.get("/", tags=["General"])
def read_root():
    return {
        "status": "online",
        "sistema": "Ensilados Santa Cruz - Sistema de Inventario & Kardex",
        "version": "1.0.0",
        "documentacion": "/docs",
        "motor_bd": "Supabase PostgreSQL",
        "region": "Santa Cruz, Bolivia"
    }

# ----------------- AUTENTICACIÓN -----------------
@app.post("/api/v1/auth/login", response_model=schemas.TokenResponse, tags=["Seguridad"])
def login(credenciales: schemas.LoginRequest, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        (models.User.email == credenciales.username) | (models.User.nombre == credenciales.username)
    ).first()
    
    if db_user and db_user.password_hash == credenciales.password:
        token = create_access_token({"sub": db_user.nombre, "rol": db_user.rol})
        return {
            "access_token": token,
            "token_type": "bearer",
            "username": db_user.nombre,
            "rol": db_user.rol
        }
    
    # Credenciales iniciales para sustentación / demo
    if credenciales.username == "admin" and credenciales.password in ["123456", "123"]:
        token = create_access_token({"sub": "admin", "rol": "admin"})
        return {
            "access_token": token,
            "token_type": "bearer",
            "username": "admin",
            "rol": "admin"
        }
        
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas (Usuario: admin, Contraseña: 123456)",
    )

# ----------------- 1. PRODUCTOS / INVENTARIO ESTRICTO -----------------
@app.get("/api/v1/products", response_model=List[schemas.ProductOut], tags=["Inventario"])
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.id.asc()).all()

@app.post("/api/v1/products", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED, tags=["Inventario"])
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.sku == product.sku).first()
    if db_product:
        raise HTTPException(status_code=400, detail="El código SKU ya existe en el inventario")
    
    new_product = models.Product(**product.model_dump())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    # Registrar en Kardex movimiento inicial si tiene stock
    if new_product.stock > 0:
        kardex = models.KardexMovement(
            product_id=new_product.id,
            tipo_movimiento="ENTRADA",
            cantidad=new_product.stock,
            stock_anterior=0,
            stock_nuevo=new_product.stock,
            costo_unitario=new_product.cost_price,
            referencia="Inventario Inicial",
            motivo="Carga inicial de producto al catálogo"
        )
        db.add(kardex)
        db.commit()

    return new_product

@app.put("/api/v1/products/{product_id}", response_model=schemas.ProductOut, tags=["Inventario"])
def update_product(product_id: int, product_data: schemas.ProductUpdate, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    update_dict = product_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(db_product, key, value)
        
    db.commit()
    db.refresh(db_product)
    return db_product

@app.delete("/api/v1/products/{product_id}", status_code=status.HTTP_200_OK, tags=["Inventario"])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    db.delete(db_product)
    db.commit()
    return {"mensaje": f"Producto '{db_product.name}' eliminado con éxito"}

# ----------------- 2. PROVEEDORES / CLIENTES -----------------
@app.get("/api/v1/suppliers", response_model=List[schemas.SupplierOut], tags=["Proveedores"])
def list_suppliers(db: Session = Depends(get_db)):
    return db.query(models.Supplier).order_by(models.Supplier.id.asc()).all()

@app.post("/api/v1/suppliers", response_model=schemas.SupplierOut, status_code=status.HTTP_201_CREATED, tags=["Proveedores"])
def create_supplier(supplier: schemas.SupplierCreate, db: Session = Depends(get_db)):
    db_supp = db.query(models.Supplier).filter(models.Supplier.nit_ci == supplier.nit_ci).first()
    if db_supp:
        raise HTTPException(status_code=400, detail="Ya existe un proveedor/cliente con este NIT/CI")
    
    new_supp = models.Supplier(**supplier.model_dump())
    db.add(new_supp)
    db.commit()
    db.refresh(new_supp)
    return new_supp

# ----------------- 3. COMPRAS (ENTRADAS DE ENSILADOS / FORRAJES) -----------------
@app.get("/api/v1/purchases", response_model=List[schemas.PurchaseOut], tags=["Compras"])
def list_purchases(db: Session = Depends(get_db)):
    return db.query(models.Purchase).order_by(models.Purchase.id.desc()).all()

@app.post("/api/v1/purchases", response_model=schemas.PurchaseOut, status_code=status.HTTP_201_CREATED, tags=["Compras"])
def create_purchase(purchase_in: schemas.PurchaseCreate, db: Session = Depends(get_db)):
    if not purchase_in.items:
        raise HTTPException(status_code=400, detail="La orden de compra no contiene productos")
    
    total = 0.0
    items_to_create = []
    
    try:
        for item in purchase_in.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Producto con ID {item.product_id} no encontrado")
            
            stock_previo = product.stock
            product.stock += item.quantity
            product.cost_price = item.unit_cost
            
            subtotal = item.unit_cost * item.quantity
            total += subtotal
            items_to_create.append({
                "product_id": product.id,
                "quantity": item.quantity,
                "unit_cost": item.unit_cost,
                "stock_anterior": stock_previo,
                "stock_nuevo": product.stock
            })
            
        db_purchase = models.Purchase(
            supplier_id=purchase_in.supplier_id,
            total_amount=total
        )
        db.add(db_purchase)
        db.flush()
        
        for detail in items_to_create:
            db_detail = models.PurchaseItem(
                purchase_id=db_purchase.id,
                product_id=detail["product_id"],
                quantity=detail["quantity"],
                unit_cost=detail["unit_cost"]
            )
            db.add(db_detail)

            # Registro en Kardex de Auditoría
            kardex = models.KardexMovement(
                product_id=detail["product_id"],
                tipo_movimiento="ENTRADA",
                cantidad=detail["quantity"],
                stock_anterior=detail["stock_anterior"],
                stock_nuevo=detail["stock_nuevo"],
                costo_unitario=detail["unit_cost"],
                referencia=f"Compra #{db_purchase.id}",
                motivo="Entrada de mercadería por adquisición"
            )
            db.add(kardex)
            
        db.commit()
        db.refresh(db_purchase)
        return db_purchase
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en la transacción de compra: {str(e)}")

# ----------------- 4. TRANSACCIÓN DE VENTA (CHECKOUT & DESCUENTO ATÓMICO) -----------------
@app.get("/api/v1/sales", response_model=List[schemas.SaleOut], tags=["Ventas"])
def list_sales(db: Session = Depends(get_db)):
    return db.query(models.Sale).order_by(models.Sale.id.desc()).all()

@app.post("/api/v1/sales/checkout", response_model=schemas.SaleOut, status_code=status.HTTP_201_CREATED, tags=["Ventas"])
def checkout_sale(sale_in: schemas.SaleCreate, db: Session = Depends(get_db)):
    if not sale_in.items:
        raise HTTPException(status_code=400, detail="La orden no contiene productos")

    total = 0.0
    items_to_create = []

    try:
        # Validación y descuento estricto de existencias
        for item in sale_in.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Producto con ID {item.product_id} no encontrado")
            if product.stock < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para '{product.name}'. Solicitado: {item.quantity}, Disponible: {product.stock}"
                )

            stock_previo = product.stock
            product.stock -= item.quantity
            subtotal = product.price * item.quantity
            total += subtotal
            items_to_create.append({
                "product_id": product.id,
                "quantity": item.quantity,
                "unit_price": product.price,
                "stock_anterior": stock_previo,
                "stock_nuevo": product.stock
            })

        # Registrar cabecera de la venta
        db_sale = models.Sale(total_amount=total)
        db.add(db_sale)
        db.flush()

        # Registrar detalle de ítems y Kardex
        for detail in items_to_create:
            db_detail = models.SaleItem(
                sale_id=db_sale.id,
                product_id=detail["product_id"],
                quantity=detail["quantity"],
                unit_price=detail["unit_price"]
            )
            db.add(db_detail)

            # Trazabilidad en Kardex
            kardex = models.KardexMovement(
                product_id=detail["product_id"],
                tipo_movimiento="SALIDA",
                cantidad=detail["quantity"],
                stock_anterior=detail["stock_anterior"],
                stock_nuevo=detail["stock_nuevo"],
                costo_unitario=detail["unit_price"],
                referencia=f"Venta #{db_sale.id}",
                motivo="Salida por venta a cliente"
            )
            db.add(kardex)

        db.commit()
        db.refresh(db_sale)
        return db_sale
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en la transacción de venta: {str(e)}")

# ----------------- 5. KARDEX DE AUDITORÍA -----------------
@app.get("/api/v1/kardex", response_model=List[schemas.KardexOut], tags=["Kardex"])
def get_kardex(db: Session = Depends(get_db)):
    return db.query(models.KardexMovement).order_by(models.KardexMovement.id.desc()).all()
