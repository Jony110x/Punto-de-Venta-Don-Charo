from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# Schemas para Productos
class ProductoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    precio: float
    stock: int
    stock_minimo: int = 10
    categoria: Optional[str] = None
    codigo_barras: Optional[str] = None

class ProductoCreate(ProductoBase):
    pass

class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    precio: Optional[float] = None
    stock: Optional[int] = None
    categoria: Optional[str] = None

class Producto(ProductoBase):
    id: int
    activo: bool
    fecha_creacion: datetime
    
    class Config:
        from_attributes = True

# Schemas para Ventas
class ItemVentaCreate(BaseModel):
    producto_id: int
    cantidad: int
    precio_unitario: float

class ItemVenta(BaseModel):
    id: int
    producto_id: int
    cantidad: int
    precio_unitario: float
    subtotal: float
    
    class Config:
        from_attributes = True

class VentaCreate(BaseModel):
    items: List[ItemVentaCreate]
    metodo_pago: str = "efectivo"
    observaciones: Optional[str] = None

class Venta(BaseModel):
    id: int
    fecha: datetime
    total: float
    metodo_pago: str
    items: List[ItemVenta]
    
    class Config:
        from_attributes = True

# Schemas para Movimientos Financieros
class MovimientoFinancieroCreate(BaseModel):
    tipo: str
    monto: float
    concepto: str
    categoria: Optional[str] = None
    observaciones: Optional[str] = None

class MovimientoFinanciero(BaseModel):
    id: int
    fecha: datetime
    tipo: str
    monto: float
    concepto: str
    categoria: Optional[str]
    
    class Config:
        from_attributes = True