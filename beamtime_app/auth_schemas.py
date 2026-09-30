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

from pydantic import BaseModel, ConfigDict, Field, field_validator

__all__ = ["LoginRequest", "validate_login_input"]

logger = logging.getLogger(__name__)

MAX_USERNAME_LENGTH = 32
MAX_PASSWORD_LENGTH = 256
MIN_PASSWORD_LENGTH = 1
ALLOWED_USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9._@-]+$")


class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, validate_assignment=True, frozen=True)

    username: str = Field(min_length=1, max_length=MAX_USERNAME_LENGTH)
    password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH, repr=False)

    @field_validator("username", mode="before")
    @classmethod
    def sanitize_and_validate_username(cls, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("Username must be a string")
        sanitized = value.strip().lower()
        sanitized = "".join(char for char in sanitized if ord(char) >= 32)
        if not sanitized or sanitized.isspace():
            raise ValueError("Username cannot be empty")
        if not ALLOWED_USERNAME_PATTERN.match(sanitized):
            raise ValueError("Username contains invalid characters.")
        return sanitized

    @field_validator("password", mode="before")
    @classmethod
    def sanitize_and_validate_password(cls, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("Password must be a string")
        password = value.replace("\x00", "")
        if not password:
            raise ValueError("Password cannot be empty")
        return password


def validate_login_input(data: dict) -> LoginRequest:
    try:
        return LoginRequest.model_validate(data)
    except Exception as e:
        logger.warning(f"Login input validation failed: {str(e)}")
        raise ValueError("Invalid input data provided") from e
