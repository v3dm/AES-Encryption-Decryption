# crud.py
from db import SessionLocal, EncryptedBlob

def create_blob(ciphertext_b64: str, filename: str = None, note: str = None, owner: str = None):
    db = SessionLocal()
    try:
        blob = EncryptedBlob(
            ciphertext_b64=ciphertext_b64,
            filename=filename,
            note=note,
            owner=owner
        )
        db.add(blob)
        db.commit()
        db.refresh(blob)
        return blob
    finally:
        db.close()

def get_blob(blob_id: int):
    db = SessionLocal()
    try:
        return db.query(EncryptedBlob).filter(EncryptedBlob.id == blob_id).first()
    finally:
        db.close()

def list_blobs(limit: int = 50):
    db = SessionLocal()
    try:
        return db.query(EncryptedBlob).order_by(EncryptedBlob.created_at.desc()).limit(limit).all()
    finally:
        db.close()

def delete_blob(blob_id: int):
    db = SessionLocal()
    try:
        b = db.query(EncryptedBlob).filter(EncryptedBlob.id == blob_id).first()
        if not b:
            return False
        db.delete(b)
        db.commit()
        return True
    finally:
        db.close()
