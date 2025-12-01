from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes import productos, ventas, reportes

app = FastAPI(title="Sistema Don Charo API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crear tablas
@app.on_event("startup")
def on_startup():
    init_db()

# Incluir routers
app.include_router(productos.router)
app.include_router(ventas.router)
app.include_router(reportes.router)

@app.get("/")
def root():
    return {"message": "API Sistema Don Charo - Funcionando correctamente"}

@app.get("/health")
def health_check():
    return {"status": "ok"}