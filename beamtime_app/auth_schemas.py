#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/auth_schemas.py
# ----------------------------------------------------------------------------------
# Purpose:
# This file defines Pydantic schemas for secure authentication input validation
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
# Copyright (C) 2025-2026 NSF SEES, USA
# ----------------------------------------------------------------------------------

import re
import secrets
from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.functional_validators import BeforeValidator

__all__ = ["LoginRequest", "LoginResponse", "UserInfo", "AuthError", "validate_login_input"]

# Security constants
MAX_USERNAME_LENGTH = 32
MAX_PASSWORD_LENGTH = 256
MIN_PASSWORD_LENGTH = 1
ALLOWED_USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9._@-]+$")


def sanitize_username(value: str) -> str:
    """Sanitize username input to prevent injection attacks."""
    if not isinstance(value, str):
        raise ValueError("Username must be a string")

    # Strip whitespace and convert to lowercase for consistency
    sanitized = value.strip().lower()

    # Remove any null bytes or control characters
    sanitized = "".join(char for char in sanitized if ord(char) >= 32)

    return sanitized


def validate_username_pattern(value: str) -> str:
    """Validate username against allowed character pattern."""
    if not ALLOWED_USERNAME_PATTERN.match(value):
        raise ValueError("Username contains invalid characters. Only letters, numbers, dots, underscores, @ symbols, and hyphens are allowed.")
    return value


def sanitize_password(value: str) -> str:
    """Sanitize password input while preserving necessary characters."""
    if not isinstance(value, str):
        raise ValueError("Password must be a string")

    # Remove null bytes but preserve other characters (passwords can be complex)
    sanitized = value.replace("\x00", "")

    return sanitized


# Type aliases with validation
SanitizedUsername = Annotated[
    str, BeforeValidator(sanitize_username), Field(min_length=1, max_length=MAX_USERNAME_LENGTH), BeforeValidator(validate_username_pattern)
]

SanitizedPassword = Annotated[str, BeforeValidator(sanitize_password), Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)]


class AuthError(BaseModel):
    """Standard authentication error response."""

    model_config = ConfigDict(frozen=True)

    success: bool = Field(default=False, description="Always false for errors")
    error: str = Field(description="Error message")
    error_code: Optional[str] = Field(default=None, description="Optional error code")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")


class LoginRequest(BaseModel):
    """Secure login request schema with input validation and sanitization."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        frozen=True,
    )

    username: SanitizedUsername = Field(description="User's login username", examples=["john.doe", "user@domain.com", "jsmith"])

    password: SanitizedPassword = Field(
        description="User's password",
        repr=False,
    )

    client_info: Optional[str] = Field(default=None, max_length=500, description="Optional client information for security logging")

    @field_validator("username")
    @classmethod
    def validate_username_not_empty(cls, username: str) -> str:
        """Ensure username is not empty after sanitization."""
        if not username or username.isspace():
            raise ValueError("Username cannot be empty")
        return username

    @field_validator("password")
    @classmethod
    def validate_password_not_empty(cls, password: str) -> str:
        """Ensure password is not empty."""
        if not password:
            raise ValueError("Password cannot be empty")
        return password


class UserInfo(BaseModel):
    """User information response schema."""

    model_config = ConfigDict(frozen=True)

    username: str = Field(description="User's username")
    full_name: str = Field(description="User's full name")
    first_name: Optional[str] = Field(default=None, description="User's first name")
    last_name: Optional[str] = Field(default=None, description="User's last name")


class LoginResponse(BaseModel):
    """Secure login response schema."""

    model_config = ConfigDict(frozen=True)

    success: bool = Field(description="Whether login was successful")
    redirect: Optional[str] = Field(default=None, description="Redirect URL after login")
    user: Optional[UserInfo] = Field(default=None, description="User information if successful")
    error: Optional[str] = Field(default=None, description="Error message if unsuccessful")
    session_id: Optional[str] = Field(default=None, description="Session identifier")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")

    @field_validator("redirect")
    @classmethod
    def validate_redirect_url(cls, redirect_url: Optional[str]) -> Optional[str]:
        """Validate redirect URL to prevent open redirect attacks."""
        if not redirect_url:
            return redirect_url

        # Basic validation - should be relative URL or same origin
        if redirect_url.startswith(("http://", "https://", "//")):
            raise ValueError("Absolute redirect URLs are not allowed for security")

        # Must start with / for relative URLs
        if not redirect_url.startswith("/"):
            redirect_url = "/" + redirect_url

        return redirect_url


def validate_login_input(data: dict) -> LoginRequest:
    """Validate and sanitize login input data."""
    try:
        return LoginRequest.model_validate(data)
    except Exception as e:
        # Log the validation error but don't expose internal details
        import logging

        logger = logging.getLogger(__name__)
        logger.warning(f"Login input validation failed: {str(e)}")
        raise ValueError("Invalid input data provided") from e


# Security helper functions
def generate_session_id() -> str:
    """Generate a secure session identifier."""
    return secrets.token_urlsafe(32)


def create_error_response(error_message: str, error_code: Optional[str] = None) -> AuthError:
    """Create a standardized error response."""
    return AuthError(error=error_message, error_code=error_code)


def create_success_response(user_info: UserInfo, redirect_url: Optional[str] = None, include_session_id: bool = True) -> LoginResponse:
    """Create a standardized success response."""
    session_id = generate_session_id() if include_session_id else None

    return LoginResponse(success=True, user=user_info, redirect=redirect_url, session_id=session_id)
