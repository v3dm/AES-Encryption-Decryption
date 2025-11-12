# db.py
import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, func, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Default to local SQLite for development
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data.db")

# For sqlite allow same thread
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class EncryptedBlob(Base):
    __tablename__ = "encrypted_blobs"
    id = Column(Integer, primary_key=True, index=True)
    ciphertext_b64 = Column(Text, nullable=False)    # base64 string of salt||iv||tag||ct
    filename = Column(String(255), nullable=True)
    note = Column(String(512), nullable=True)
    algorithm = Column(String(100), nullable=False, default="AES-256-GCM")
    kdf = Column(String(100), nullable=False, default="PBKDF2:100000")
    owner = Column(String(255), nullable=True)       # optional user identifier
    created_at = Column(DateTime(timezone=True), server_default=func.now())
