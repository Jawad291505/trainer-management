"""Password hashing + JWT + OTP/opaque-token hashing.

Hand-rolled on purpose so the moving parts are visible:
- `bcrypt` directly for password hashing (salted, slow — good for passwords).
- `pyjwt` for signing / verifying short-lived access tokens.
- HMAC-SHA256 for OTP codes and refresh tokens: *deterministic*, so we can look
  a refresh token up by its hash. Brute force is handled by short expiry +
  attempt caps, not by the hash being slow.
"""

import hmac
import secrets
from datetime import UTC, datetime, timedelta
from hashlib import sha256

import bcrypt
import jwt

from app.core.config import settings


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(subject: str, extra_claims: dict | None = None) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": subject,  # we put the user id here
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Raises jwt.PyJWTError (expired, bad signature, malformed) on any problem."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


# --- Opaque tokens (refresh tokens) + OTP codes ---------------------------------


def generate_refresh_token() -> str:
    """A long, URL-safe random string. The raw value is returned to the client
    once; only its hash is stored."""
    return secrets.token_urlsafe(48)


def generate_otp(digits: int = 6) -> str:
    """A zero-padded numeric code, e.g. '048213'."""
    upper = 10**digits
    return str(secrets.randbelow(upper)).zfill(digits)


def hash_token(raw: str) -> str:
    """Deterministic keyed hash — same input always yields the same output, so a
    refresh token can be found by `WHERE token_hash = ...`."""
    return hmac.new(settings.JWT_SECRET.encode(), raw.encode(), sha256).hexdigest()


def tokens_match(raw: str, stored_hash: str) -> bool:
    return hmac.compare_digest(hash_token(raw), stored_hash)
