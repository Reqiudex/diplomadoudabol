import os
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import jwt
from fastapi import FastAPI, Depends, HTTPException, status, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

import models
import schemas
from database import engine, get_db
from slack_notifier import send_slack_notification

load_dotenv()

# Sincroniza y crea tablas en Supabase PostgreSQL
models.Base.metadata.create_all(bind=engine)

SECRET_KEY = os.getenv("SECRET_KEY", os.getenv("JWT_SECRET_KEY", "clave_secreta_demo_ferreteria_2026_udabol"))
ALGORITHM = os.getenv("ALGORITHM", os.getenv("JWT_ALGORITHM", "HS256"))
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))
PORT = int(os.getenv("PORT", "8000"))

app = FastAPI(
    title="Ferretería & Ensilados - API de Compra, Venta, Inventario y Kardex",
    version="2.0.0",
    description="Sistema para ferretería y silos ganaderos (FastAPI + Supabase PostgreSQL). Despliegue listo para Coolify en diplomado.cerice360.com.",
)

# CORS: permitir Coolify (diplomado.cerice360.com), Cloudflare y desarrollo local
configured_origins = os.getenv("CORS_ORIGINS", "")
origins_list = [origin.strip() for origin in configured_origins.split(",") if origin.strip()]

default_origins = [
    "https://diplomado.cerice360.com",
    "http://diplomado.cerice360.com",
    "https://api.diplomado.cerice360.com",
    "http://api.diplomado.cerice360.com",
    "https://ensilados.cherry.lat",
    "http://ensilados.cherry.lat",
    "https://ensiladosapi.cherry.lat",
    "http://ensiladosapi.cherry.lat",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*"
]

all_origins = list(set(default_origins + origins_list))

app.add_middleware(
    CORSMiddleware,
    allow_origins=all_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user_payload(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de autorización requerido")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado")

def require_role(allowed_roles: List[str]):
    def role_checker(payload: dict = Depends(get_current_user_payload)):
        user_role = payload.get("rol", "SELLER")
        if user_role not in allowed_roles and user_role != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso denegado. Se requiere uno de los siguientes roles: {', '.join(allowed_roles)}"
            )
        return payload
    return role_checker

# ----------------- ENDPOINTS DE SALUD (HEALTHCHECK COOLIFY) -----------------
@app.get("/health", tags=["Salud"])
def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/", tags=["General"])
def read_root():
    return {
        "status": "online",
        "sistema": "Sistema de Compra-Venta, Inventario Estricto y Kardex de Auditoría",
        "version": "2.0.0",
        "documentacion": "/docs",
        "motor_bd": "Supabase PostgreSQL",
        "dominio_produccion": "diplomado.cerice360.com"
    }

# ----------------- AUTENTICACIÓN / USUARIOS -----------------
@app.post("/api/v1/auth/login", response_model=schemas.TokenResponse, tags=["Seguridad"])
def login(credenciales: schemas.LoginRequest, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        (models.User.email == credenciales.username) | (models.User.nombre == credenciales.username)
    ).first()
    
    if db_user:
        # Verificar hash seguro bcrypt o fallback temporal de demo
        if models.verify_password(credenciales.password, db_user.password_hash) or db_user.password_hash == credenciales.password:
            token = create_access_token({"sub": db_user.nombre, "email": db_user.email, "rol": db_user.rol, "uid": db_user.id})
            return {
                "access_token": token,
                "token_type": "bearer",
                "username": db_user.nombre,
                "rol": db_user.rol
            }
    
    # Credenciales iniciales para sustentación / demo si aún no se ha creado usuario
    if credenciales.username == "admin" and credenciales.password in ["123456", "123"]:
        token = create_access_token({"sub": "admin", "email": "admin@ferreteria.local", "rol": "ADMIN", "uid": 1})
        return {
            "access_token": token,
            "token_type": "bearer",
            "username": "admin",
            "rol": "ADMIN"
        }
        
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas (Usuario: admin, Contraseña: 123456)",
    )

@app.post("/api/v1/users", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED, tags=["Usuarios"])
def create_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")
    
    hashed = models.hash_password(user_in.password)
    new_user = models.User(
        nombre=user_in.nombre,
        email=user_in.email,
        password_hash=hashed,
        rol=user_in.rol,
        estado=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/api/v1/users", response_model=List[schemas.UserOut], tags=["Usuarios"])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

# ----------------- 1. PRODUCTOS / INVENTARIO ESTRICTO -----------------
@app.get("/api/v1/products", response_model=List[schemas.ProductOut], tags=["Inventario"])
def list_products(
    search: Optional[str] = Query(None, description="Buscar por nombre o SKU"),
    categoria: Optional[str] = Query(None),
    bajo_stock: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Product).filter(models.Product.estado == True)
    if search:
        query = query.filter((models.Product.name.ilike(f"%{search}%")) | (models.Product.sku.ilike(f"%{search}%")))
    if categoria:
        query = query.filter(models.Product.categoria == categoria)
    if bajo_stock:
        query = query.filter(models.Product.stock <= models.Product.min_stock)
        
    return query.order_by(models.Product.id.asc()).all()

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

    # Notificación opcional a Slack (no bloqueante)
    try:
        send_slack_notification(
            f"🆕 *Nuevo Producto Registrado:* {new_product.name}",
            {
                "SKU": new_product.sku,
                "Categoría": new_product.categoria,
                "Stock": str(new_product.stock),
                "Precio Venta": f"${new_product.price}"
            }
        )
    except Exception:
        pass

    return new_product

@app.get("/api/v1/products/{product_id}", response_model=schemas.ProductOut, tags=["Inventario"])
def get_product(product_id: int, db: Session = Depends(get_db)):
    prod = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return prod

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
    
    # Borrado lógico recomendado para no romper integridad de Kardex
    db_product.estado = False
    db.commit()
    return {"mensaje": f"Producto '{db_product.name}' desactivado con éxito"}

# ----------------- 2. PROVEEDORES -----------------
@app.get("/api/v1/suppliers", response_model=List[schemas.SupplierOut], tags=["Proveedores"])
def list_suppliers(db: Session = Depends(get_db)):
    return db.query(models.Supplier).order_by(models.Supplier.id.asc()).all()

@app.post("/api/v1/suppliers", response_model=schemas.SupplierOut, status_code=status.HTTP_201_CREATED, tags=["Proveedores"])
def create_supplier(supplier: schemas.SupplierCreate, db: Session = Depends(get_db)):
    db_supp = db.query(models.Supplier).filter(models.Supplier.nit_ci == supplier.nit_ci).first()
    if db_supp:
        raise HTTPException(status_code=400, detail="Ya existe un proveedor con este NIT/CI")
    
    data = supplier.model_dump()
    if not data.get("nombre") and data.get("nombre_razon_social"):
        data["nombre"] = data["nombre_razon_social"]
    data["nombre_razon_social"] = data["nombre"]
    
    new_supp = models.Supplier(**data)
    db.add(new_supp)
    db.commit()
    db.refresh(new_supp)
    return new_supp

# ----------------- 3. CLIENTES -----------------
@app.get("/api/v1/customers", response_model=List[schemas.CustomerOut], tags=["Clientes"])
def list_customers(db: Session = Depends(get_db)):
    return db.query(models.Customer).order_by(models.Customer.id.asc()).all()

@app.post("/api/v1/customers", response_model=schemas.CustomerOut, status_code=status.HTTP_201_CREATED, tags=["Clientes"])
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    if customer.documento_nit:
        existing = db.query(models.Customer).filter(models.Customer.documento_nit == customer.documento_nit).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe un cliente con este documento/NIT")
            
    new_customer = models.Customer(**customer.model_dump())
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer

# ----------------- 4. COMPRAS (ENTRADAS DE INVENTARIO) -----------------
@app.get("/api/v1/purchases", response_model=List[schemas.PurchaseOut], tags=["Compras"])
def list_purchases(db: Session = Depends(get_db)):
    return db.query(models.Purchase).order_by(models.Purchase.id.desc()).all()

@app.post("/api/v1/purchases", response_model=schemas.PurchaseOut, status_code=status.HTTP_201_CREATED, tags=["Compras"])
def create_purchase(purchase_in: schemas.PurchaseCreate, db: Session = Depends(get_db)):
    if not purchase_in.items:
        raise HTTPException(status_code=400, detail="La orden de compra no contiene productos")
    
    total = Decimal("0.00")
    items_to_create = []
    
    try:
        # Transacción con bloqueo de fila con with_for_update para prevenir condiciones de carrera
        for item in purchase_in.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Producto con ID {item.product_id} no encontrado")
            
            stock_previo = product.stock
            product.stock += item.quantity
            product.cost_price = item.unit_cost
            
            subtotal = Decimal(str(item.unit_cost)) * Decimal(str(item.quantity))
            total += subtotal
            items_to_create.append({
                "product_id": product.id,
                "quantity": item.quantity,
                "unit_cost": item.unit_cost,
                "subtotal": subtotal,
                "stock_anterior": stock_previo,
                "stock_nuevo": product.stock
            })
            
        db_purchase = models.Purchase(
            supplier_id=purchase_in.supplier_id,
            subtotal=total,
            total_amount=total,
            observaciones=purchase_in.observaciones
        )
        db.add(db_purchase)
        db.flush()
        
        for detail in items_to_create:
            db_detail = models.PurchaseItem(
                purchase_id=db_purchase.id,
                product_id=detail["product_id"],
                quantity=detail["quantity"],
                unit_cost=detail["unit_cost"],
                subtotal=detail["subtotal"]
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
                motivo="Entrada de mercadería por compra"
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

# ----------------- 5. VENTAS (CHECKOUT & DESCUENTO ATÓMICO) -----------------
@app.get("/api/v1/sales", response_model=List[schemas.SaleOut], tags=["Ventas"])
def list_sales(db: Session = Depends(get_db)):
    return db.query(models.Sale).order_by(models.Sale.id.desc()).all()

@app.post("/api/v1/sales/checkout", response_model=schemas.SaleOut, status_code=status.HTTP_201_CREATED, tags=["Ventas"])
def checkout_sale(sale_in: schemas.SaleCreate, db: Session = Depends(get_db)):
    if not sale_in.items:
        raise HTTPException(status_code=400, detail="La orden no contiene productos")

    subtotal_total = Decimal("0.00")
    items_to_create = []

    try:
        # Validación y descuento con bloqueo pesimista en PostgreSQL (FOR UPDATE)
        for item in sale_in.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Producto con ID {item.product_id} no encontrado")
            if product.stock < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para '{product.name}'. Solicitado: {item.quantity}, Disponible: {product.stock}"
                )

            stock_previo = product.stock
            product.stock -= item.quantity
            item_subtotal = Decimal(str(product.price)) * Decimal(str(item.quantity))
            subtotal_total += item_subtotal
            
            items_to_create.append({
                "product_id": product.id,
                "quantity": item.quantity,
                "unit_price": product.price,
                "subtotal": item_subtotal,
                "stock_anterior": stock_previo,
                "stock_nuevo": product.stock
            })

        descuento = Decimal(str(sale_in.descuento or 0.00))
        total_final = max(Decimal("0.00"), subtotal_total - descuento)

        # Registrar cabecera de la venta calculada estrictamente en el backend
        db_sale = models.Sale(
            customer_id=sale_in.customer_id,
            subtotal=subtotal_total,
            descuento=descuento,
            total_amount=total_final,
            metodo_pago=sale_in.metodo_pago,
            observaciones=sale_in.observaciones
        )
        db.add(db_sale)
        db.flush()

        # Registrar detalle de ítems y Kardex
        for detail in items_to_create:
            db_detail = models.SaleItem(
                sale_id=db_sale.id,
                product_id=detail["product_id"],
                quantity=detail["quantity"],
                unit_price=detail["unit_price"],
                subtotal=detail["subtotal"]
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

# ----------------- 6. KARDEX DE AUDITORÍA -----------------
@app.get("/api/v1/kardex", response_model=List[schemas.KardexOut], tags=["Kardex"])
def get_kardex(product_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.KardexMovement)
    if product_id:
        query = query.filter(models.KardexMovement.product_id == product_id)
    return query.order_by(models.KardexMovement.id.desc()).all()
