from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated, Any, Dict, Optional

import httpx
import structlog
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = structlog.get_logger(__name__)

DEFAULT_TIMEOUT = 5  # seconds


@dataclass
class AuthResult:
    valid: bool
    username: Optional[str] = None
    error_type: Optional[str] = None

    def as_dict(self) -> Dict[str, Any]:
        return {
            "valid": self.valid,
            "username": self.username,
            "error_type": self.error_type,
        }


class UserAuthHandler:
    def __init__(self, auth_url: str | None = None, timeout: int = DEFAULT_TIMEOUT):
        # host depends on the host url of auth-service
        # or the name of the container of auth-service in docker-compose.yml if you use docker-compose
        self.user_auth_url = (
            auth_url or "http://localhost:5521/extreme_auth/api/v1/person/userinfo"
        )
        self.timeout = timeout

    def verify_user(self, token: str) -> Dict[str, Any]:
        if not token:
            return AuthResult(valid=False, error_type="missing_token").as_dict()

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(
                    url=self.user_auth_url,
                    headers={"Authorization": token},
                )
        except httpx.RequestError as exc:
            logger.error("Authentication service error", error=str(exc))
            return AuthResult(
                valid=False, error_type="auth_service_unreachable"
            ).as_dict()

        if response.status_code != 200:
            logger.warning(
                "Authentication failed",
                status_code=response.status_code,
                response=response.text,
            )
            try:
                data = response.json()
                error_type = data.get("type") or "unauthorized"
            except ValueError:
                error_type = "unauthorized"
            return AuthResult(valid=False, error_type=error_type).as_dict()

        try:
            data = response.json()
        except ValueError:
            logger.error("Authentication service returned invalid JSON")
            return AuthResult(valid=False, error_type="invalid_response").as_dict()

        username = data.get("preferred_username")
        if not username:
            logger.error(
                "Authentication payload missing 'preferred_username'", data=data
            )
            return AuthResult(valid=False, error_type="invalid_response").as_dict()

        return AuthResult(valid=True, username=username).as_dict()


HTTP_BEARER_SCHEME = HTTPBearer(auto_error=False)

AuthCredentials = Annotated[
    Optional[HTTPAuthorizationCredentials],
    Security(HTTP_BEARER_SCHEME),
]


def _auth_mode() -> str:
    return os.getenv("EXTREMEXP_AUTH_MODE", "legacy").strip().lower()


def _mock_username() -> str:
    return os.getenv("EXTREMEXP_AUTH_MOCK_USER", "test-user")


def _resolve_timeout(raw_timeout: str | None) -> int:
    if not raw_timeout:
        return DEFAULT_TIMEOUT
    try:
        timeout = int(raw_timeout)
        return timeout if timeout > 0 else DEFAULT_TIMEOUT
    except ValueError:
        logger.warning(
            "Invalid EXTREMEXP_AUTH_TIMEOUT value '%s'; falling back to default",
            raw_timeout,
        )
        return DEFAULT_TIMEOUT


@lru_cache(maxsize=1)
def get_legacy_auth_handler() -> UserAuthHandler:
    auth_url = os.getenv("EXTREMEXP_AUTH_URL") or None
    timeout = _resolve_timeout(os.getenv("EXTREMEXP_AUTH_TIMEOUT"))
    logger.info("Using legacy auth handler", auth_url=auth_url, timeout=timeout)
    return UserAuthHandler(auth_url=auth_url, timeout=timeout)


def resolve_username(credentials: AuthCredentials) -> str:
    mode = _auth_mode()
    if mode == "mock":
        username = _mock_username()
        logger.debug("Auth mode mock - using fixed username", username=username)
        return username

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    auth_header = f"{credentials.scheme} {token}" if credentials.scheme else token

    handler = get_legacy_auth_handler()
    result = handler.verify_user(auth_header)

    if not result.get("valid"):
        error_type = result.get("error_type") or "unauthorized"
        logger.warning("Authentication failed", error_type=error_type)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {error_type}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username = result.get("username")
    if not username:
        logger.error(
            "Legacy auth handler returned success without username", result=result
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: invalid response",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.debug("Authenticated user via legacy handler", username=username)
    return username


__all__ = [
    "AuthCredentials",
    "HTTP_BEARER_SCHEME",
    "get_legacy_auth_handler",
    "resolve_username",
]
