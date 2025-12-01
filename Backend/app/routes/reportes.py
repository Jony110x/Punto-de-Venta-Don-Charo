from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app import models
from app.database import get_db

router = APIRouter(prefix="/reportes", tags=["reportes"])

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    # Ventas totales
    total_ventas = db.query(func.sum(models.Venta.total)).scalar() or 0
    
    # Cantidad de ventas
    cantidad_ventas = db.query(func.count(models.Venta.id)).scalar()
    
    # Productos vendidos
    productos_vendidos = db.query(func.sum(models.ItemVenta.cantidad)).scalar() or 0
    
    # Ventas del día
    hoy = datetime.now().date()
    ventas_hoy = db.query(func.sum(models.Venta.total)).filter(
        func.date(models.Venta.fecha) == hoy
    ).scalar() or 0
    
    # Stock bajo
    stock_bajo = db.query(func.count(models.Producto.id)).filter(
        models.Producto.stock < models.Producto.stock_minimo,
        models.Producto.activo == True
    ).scalar()
    
    return {
        "total_ventas": float(total_ventas),
        "cantidad_ventas": cantidad_ventas,
        "productos_vendidos": productos_vendidos,
        "ventas_hoy": float(ventas_hoy),
        "productos_stock_bajo": stock_bajo
    }

@router.get("/ventas/mensuales")
def ventas_mensuales(db: Session = Depends(get_db)):
    mes_actual = datetime.now().month
    anio_actual = datetime.now().year
    
    ventas = db.query(
        func.date(models.Venta.fecha).label('fecha'),
        func.sum(models.Venta.total).label('total')
    ).filter(
        func.extract('month', models.Venta.fecha) == mes_actual,
        func.extract('year', models.Venta.fecha) == anio_actual
    ).group_by('fecha').all()
    
    return [{"fecha": str(v.fecha), "total": float(v.total)} for v in ventas]