from pydantic import BaseModel


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessToken(BaseModel):
    """Returned by endpoints that only mint a new access token."""

    access_token: str
    token_type: str = "bearer"
