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
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

import logging
import re
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.functional_validators import BeforeValidator

__all__ = ["LoginRequest", "validate_login_input"]

logger = logging.getLogger(__name__)

MAX_USERNAME_LENGTH = 32
MAX_PASSWORD_LENGTH = 256
MIN_PASSWORD_LENGTH = 1
ALLOWED_USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9._@-]+$")


def sanitize_username(value: str) -> str:
    if not isinstance(value, str):
        raise ValueError("Username must be a string")
    sanitized = value.strip().lower()
    return "".join(char for char in sanitized if ord(char) >= 32)


def validate_username_pattern(value: str) -> str:
    if not ALLOWED_USERNAME_PATTERN.match(value):
        raise ValueError("Username contains invalid characters.")
    return value


def sanitize_password(value: str) -> str:
    if not isinstance(value, str):
        raise ValueError("Password must be a string")
    return value.replace("\x00", "")


SanitizedUsername = Annotated[
    str, BeforeValidator(sanitize_username), Field(min_length=1, max_length=MAX_USERNAME_LENGTH), BeforeValidator(validate_username_pattern)
]
SanitizedPassword = Annotated[str, BeforeValidator(sanitize_password), Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)]


class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, validate_assignment=True, frozen=True)

    username: SanitizedUsername
    password: SanitizedPassword = Field(repr=False)

    @field_validator("username")
    @classmethod
    def validate_username_not_empty(cls, username: str) -> str:
        if not username or username.isspace():
            raise ValueError("Username cannot be empty")
        return username

    @field_validator("password")
    @classmethod
    def validate_password_not_empty(cls, password: str) -> str:
        if not password:
            raise ValueError("Password cannot be empty")
        return password


def validate_login_input(data: dict) -> LoginRequest:
    try:
        return LoginRequest.model_validate(data)
    except Exception as e:
        logger.warning(f"Login input validation failed: {str(e)}")
        raise ValueError("Invalid input data provided") from e
