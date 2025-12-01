from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Producto(Base):
    __tablename__ = "productos"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(String(500))
    precio = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    stock_minimo = Column(Integer, default=10)
    categoria = Column(String(100))
    codigo_barras = Column(String(50), unique=True)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.now)
    fecha_actualizacion = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    items_venta = relationship("ItemVenta", back_populates="producto")

class Venta(Base):
    __tablename__ = "ventas"
    
    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, default=datetime.now)
    total = Column(Float, nullable=False)
    metodo_pago = Column(String(50), default="efectivo")
    observaciones = Column(String(500))
    
    items = relationship("ItemVenta", back_populates="venta", cascade="all, delete-orphan")

class ItemVenta(Base):
    __tablename__ = "items_venta"
    
    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey("ventas.id"))
    producto_id = Column(Integer, ForeignKey("productos.id"))
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    
    venta = relationship("Venta", back_populates="items")
    producto = relationship("Producto", back_populates="items_venta")

class MovimientoFinanciero(Base):
    __tablename__ = "movimientos_financieros"
    
    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, default=datetime.now)
    tipo = Column(String(20), nullable=False)  # ingreso o egreso
    monto = Column(Float, nullable=False)
    concepto = Column(String(200))
    categoria = Column(String(100))
    observaciones = Column(String(500))