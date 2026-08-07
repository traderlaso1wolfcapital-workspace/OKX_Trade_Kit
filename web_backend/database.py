import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from redis import Redis

# Use PostgreSQL Database URL from env or fallback to local docker mapping
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://tls1_admin:tls1_password@localhost:5432/tls1_trading_os")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Redis Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = Redis.from_url(REDIS_URL, decode_responses=True)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
