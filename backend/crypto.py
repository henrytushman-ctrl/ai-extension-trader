"""
Token encryption helpers using Fernet (symmetric AES-128-CBC + HMAC-SHA256).
Key is derived from SECRET_KEY env var via SHA-256 so any string works.
"""
import base64
import hashlib

from cryptography.fernet import Fernet

from backend.config import settings


def _fernet() -> Fernet:
    key = hashlib.sha256(settings.secret_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_token(token: str) -> str:
    return _fernet().encrypt(token.encode()).decode()


def decrypt_token(token: str) -> str:
    """Decrypt a Fernet token. Returns plaintext or raises InvalidToken."""
    return _fernet().decrypt(token.encode()).decode()
