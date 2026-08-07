import socketio
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn

from .database import engine, Base, get_db
from . import models

# Create Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="TLS1 Trading OS Backend", version="1.0.0")

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

@sio.event
async def connect(sid, environ):
    print(f"[Socket.IO] Client connected: {sid}")
    await sio.emit('system_message', {'msg': 'Connected to TLS1 Trading OS'})

@sio.event
async def disconnect(sid):
    print(f"[Socket.IO] Client disconnected: {sid}")

# Basic REST endpoints
@app.get("/")
def read_root():
    return {"message": "Welcome to TLS1 Trading OS API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/users")
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users
