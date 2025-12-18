from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from typing import Annotated, Optional

import httpx
import structlog
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = structlog.get_logger(__name__)

DEFAULT_TIMEOUT = 5  # seconds


@dataclass(frozen=True)
class UserCredentials:
    """Authenticated user credentials with optional expiration time."""

    username: str
    expires_at: datetime | None = None

    @property
    def is_expired(self) -> bool:
        """Check if the credentials have expired."""
        if self.expires_at is None:
            return False
        return datetime.now(timezone.utc) > self.expires_at


@dataclass
class AuthResult:
    """Internal result from the auth handler."""

    valid: bool
    username: str | None = None
    expires_at: datetime | None = None
    error_type: str | None = None


def _parse_expiration(exp: int | float | None) -> datetime | None:
    """Parse an expiration timestamp into a datetime."""
    if exp is None:
        return None
    try:
        return datetime.fromtimestamp(exp, tz=timezone.utc)
    except (ValueError, TypeError, OSError) as exc:
        logger.debug("Failed to parse expiration", exp=exp, error=str(exc))
        return None


class UserAuthHandler:
    """Handler for user authentication via an external auth service."""

    def __init__(self, auth_url: str | None = None, timeout: int = DEFAULT_TIMEOUT):
        # host depends on the host url of auth-service
        # or the name of the container of auth-service in docker-compose.yml
        self.user_auth_url = (
            auth_url or "http://localhost:5521/extreme_auth/api/v1/person/userinfo"
        )
        self.timeout = timeout

    def verify_user(self, token: str) -> AuthResult:
        """
        Verify a user token against the auth service.

        Returns an AuthResult with the verification outcome.
        """
        if not token:
            return AuthResult(valid=False, error_type="missing_token")

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(
                    url=self.user_auth_url,
                    headers={"Authorization": token},
                )
        except httpx.RequestError as exc:
            logger.error("Authentication service error", error=str(exc))
            return AuthResult(valid=False, error_type="auth_service_unreachable")

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
            return AuthResult(valid=False, error_type=error_type)

        try:
            data = response.json()
        except ValueError:
            logger.error("Authentication service returned invalid JSON")
            return AuthResult(valid=False, error_type="invalid_response")

        username = data.get("preferred_username")
        if not username:
            logger.error(
                "Authentication payload missing 'preferred_username'", data=data
            )
            return AuthResult(valid=False, error_type="invalid_response")

        expires_at = _parse_expiration(data.get("exp"))

        return AuthResult(valid=True, username=username, expires_at=expires_at)


HTTP_BEARER_SCHEME = HTTPBearer(auto_error=False)

TokenCredentials = Annotated[
    Optional[HTTPAuthorizationCredentials],
    Security(HTTP_BEARER_SCHEME),
]


def _auth_mode() -> str:
    return os.getenv("EXTREMEXP_AUTH_MODE", "default").strip().lower()


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
def get_auth_handler() -> UserAuthHandler:
    """Get the singleton auth handler instance."""
    auth_url = os.getenv("EXTREMEXP_AUTH_URL") or None
    timeout = _resolve_timeout(os.getenv("EXTREMEXP_AUTH_TIMEOUT"))
    logger.info("Initializing auth handler", auth_url=auth_url, timeout=timeout)
    return UserAuthHandler(auth_url=auth_url, timeout=timeout)


def resolve_credentials(credentials: TokenCredentials) -> UserCredentials:
    """
    Resolve and validate user credentials from the request.

    Returns a UserCredentials object containing the username and expiration time.
    Raises HTTPException if authentication fails.
    """
    mode = _auth_mode()
    if mode == "mock":
        username = _mock_username()
        logger.debug("Auth mode mock - using fixed username", username=username)
        return UserCredentials(username=username, expires_at=None)

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    auth_header = f"{credentials.scheme} {token}" if credentials.scheme else token

    handler = get_auth_handler()
    result = handler.verify_user(auth_header)

    if not result.valid:
        error_type = result.error_type or "unauthorized"
        logger.warning("Authentication failed", error_type=error_type)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {error_type}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not result.username:
        logger.error("Auth handler returned success without username", result=result)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: invalid response",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.debug(
        "Authenticated user",
        username=result.username,
        expires_at=result.expires_at.isoformat() if result.expires_at else None,
    )
    return UserCredentials(username=result.username, expires_at=result.expires_at)


# Backwards compatibility alias
def resolve_username(credentials: TokenCredentials) -> str:
    """
    Resolve username from credentials.

    Deprecated: Use resolve_credentials() instead to also get expiration time.
    """
    return resolve_credentials(credentials).username


__all__ = [
    "TokenCredentials",
    "UserCredentials",
    "HTTP_BEARER_SCHEME",
    "get_auth_handler",
    "resolve_credentials",
    "resolve_username",
]
