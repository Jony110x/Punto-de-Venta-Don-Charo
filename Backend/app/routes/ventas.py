from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/ventas", tags=["ventas"])

@router.post("/", response_model=schemas.Venta)
def crear_venta(venta: schemas.VentaCreate, db: Session = Depends(get_db)):
    # Calcular total
    total = sum(item.cantidad * item.precio_unitario for item in venta.items)
    
    # Crear venta
    db_venta = models.Venta(
        total=total,
        metodo_pago=venta.metodo_pago,
        observaciones=venta.observaciones
    )
    db.add(db_venta)
    db.flush()
    
    # Crear items y actualizar stock
    for item in venta.items:
        producto = db.query(models.Producto).filter(models.Producto.id == item.producto_id).first()
        if not producto:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Producto {item.producto_id} no encontrado")
        
        if producto.stock < item.cantidad:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {producto.nombre}")
        
        # Crear item de venta
        db_item = models.ItemVenta(
            venta_id=db_venta.id,
            producto_id=item.producto_id,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            subtotal=item.cantidad * item.precio_unitario
        )
        db.add(db_item)
        
        # Actualizar stock
        producto.stock -= item.cantidad
    
    db.commit()
    db.refresh(db_venta)
    return db_venta

@router.get("/", response_model=List[schemas.Venta])
def listar_ventas(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    ventas = db.query(models.Venta).offset(skip).limit(limit).all()
    return ventas

@router.get("/{venta_id}", response_model=schemas.Venta)
def obtener_venta(venta_id: int, db: Session = Depends(get_db)):
    venta = db.query(models.Venta).filter(models.Venta.id == venta_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return venta