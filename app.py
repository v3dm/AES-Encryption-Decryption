from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes
import base64
import os

# ---  params ---
PBKDF2_ITER = 100_000
KEY_LEN = 32
SALT_LEN = 16
IV_LEN = 12
TAG_LEN = 16

app = FastAPI()


app.mount("/static", StaticFiles(directory="static"), name="static")

# index.html at the root
@app.get("/", response_class=FileResponse)
def read_index():
    index_path = os.path.join("static", "index.html")
    return index_path


class EncryptRequest(BaseModel):
    plaintext: str
    password: str

class EncryptResponse(BaseModel):
    ciphertext_b64: str

class DecryptRequest(BaseModel):
    ciphertext_b64: str
    password: str

class DecryptResponse(BaseModel):
    plaintext: str

# --- helpers ---
def derive_key(password: str, salt: bytes) -> bytes:
    return PBKDF2(password.encode(), salt, dkLen=KEY_LEN, count=PBKDF2_ITER)

# --- API endpoints ---
@app.post("/api/encrypt", response_model=EncryptResponse)
def encrypt(req: EncryptRequest):
    if not req.password:
        raise HTTPException(status_code=400, detail="Password required")
    salt = get_random_bytes(SALT_LEN)
    key = derive_key(req.password, salt)
    iv = get_random_bytes(IV_LEN)
    cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
    ct, tag = cipher.encrypt_and_digest(req.plaintext.encode("utf-8"))
    blob = salt + iv + tag + ct
    return {"ciphertext_b64": base64.b64encode(blob).decode()}

@app.post("/api/decrypt", response_model=DecryptResponse)
def decrypt(req: DecryptRequest):
    try:
        blob = base64.b64decode(req.ciphertext_b64)
        if len(blob) < (SALT_LEN + IV_LEN + TAG_LEN):
            raise ValueError("Blob too short")
        salt = blob[:SALT_LEN]
        iv = blob[SALT_LEN:SALT_LEN + IV_LEN]
        tag = blob[SALT_LEN + IV_LEN:SALT_LEN + IV_LEN + TAG_LEN]
        ct = blob[SALT_LEN + IV_LEN + TAG_LEN:]
        key = derive_key(req.password, salt)
        cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
        plaintext_bytes = cipher.decrypt_and_verify(ct, tag)
        plaintext = plaintext_bytes.decode("utf-8")
        return {"plaintext": plaintext}
    except Exception:
        raise HTTPException(status_code=400, detail="Decryption failed (bad password or corrupted data)")
