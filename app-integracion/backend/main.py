from datetime import datetime, timedelta, timezone
from typing import Optional, List
import os
from dotenv import load_dotenv

import jwt
from fastapi import FastAPI, Header, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker, Session

load_dotenv()

# --- CONFIGURACIÓN DE SUPABASE (POSTGRESQL) ---
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Definición de la tabla en Supabase
class ProductModel(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    precio = Column(Float, nullable=False)
    stock = Column(Integer, default=0, nullable=False)

# Crea la tabla automáticamente en Supabase si no existe
Base.metadata.create_all(bind=engine)

# Dependencia de base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(
    title="API de Integración Empresarial",
    version="1.0.0",
    description="API REST de catálogo, inventario y autenticación JWT con Supabase",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

SECRET_KEY = "clave_secreta_demo_cambiar_en_produccion"
ALGORITHM = "HS256"


class LoginRequest(BaseModel):
    username: str
    password: str


class ProductoInput(BaseModel):
    nombre: str = Field(min_length=1, max_length=150)
    precio: float = Field(ge=0)
    stock: int = Field(ge=0)


@app.get("/")
def inicio():
    return {
        "mensaje": "API de Integración Empresarial funcionando con Supabase",
        "documentacion": "/docs",
    }


@app.post("/api/v1/auth/login", tags=["Seguridad"])
def login(credenciales: LoginRequest):
    if (
        credenciales.username == "admin"
        and credenciales.password == "123456"
    ):
        payload = {
            "sub": credenciales.username,
            "exp": datetime.now(timezone.utc) + timedelta(hours=2),
        }

        token = jwt.encode(
            payload,
            SECRET_KEY,
            algorithm=ALGORITHM,
        )

        return {
            "access_token": token,
            "token_type": "bearer",
        }

    raise HTTPException(
        status_code=401,
        detail="Credenciales inválidas",
    )


@app.get("/api/v1/productos", tags=["Productos"])
def listar_productos(db: Session = Depends(get_db)):
    # Lee directamente desde la base de datos en Supabase
    productos = db.query(ProductModel).all()
    return productos


@app.post(
    "/api/v1/productos",
    status_code=201,
    tags=["Productos"],
)
def crear_producto(
    item: ProductoInput,
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Token no proporcionado",
        )

    token = authorization.split(" ", 1)[1]

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if payload.get("sub") != "admin":
            raise HTTPException(
                status_code=403,
                detail="Usuario no autorizado",
            )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=403,
            detail="Token expirado",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=403,
            detail="Token inválido",
        )

    # Guarda el nuevo producto directamente en Supabase
    nuevo_producto = ProductModel(
        nombre=item.nombre,
        precio=item.precio,
        stock=item.stock
    )
    
    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)

    return nuevo_producto