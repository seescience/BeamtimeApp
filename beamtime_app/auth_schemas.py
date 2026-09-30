#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/auth_schemas.py
# ----------------------------------------------------------------------------------
# Purpose:
# This file defines schemas for secure authentication input validation
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

import logging
import re
from dataclasses import dataclass

__all__ = ["LoginRequest", "validate_login_input"]

logger = logging.getLogger(__name__)

MAX_USERNAME_LENGTH = 32
MAX_PASSWORD_LENGTH = 256
MIN_PASSWORD_LENGTH = 1
ALLOWED_USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9._@-]+$")


@dataclass(frozen=True)
class LoginRequest:
    username: str
    password: str


def validate_login_input(data: dict) -> LoginRequest:
    try:
        username = data.get("username", "")
        password = data.get("password", "")

        if not isinstance(username, str):
            raise ValueError("Username must be a string")
        username = username.strip().lower()
        username = "".join(char for char in username if ord(char) >= 32)
        if not username:
            raise ValueError("Username cannot be empty")
        if len(username) > MAX_USERNAME_LENGTH:
            raise ValueError(f"Username too long (max {MAX_USERNAME_LENGTH} characters)")
        if not ALLOWED_USERNAME_PATTERN.match(username):
            raise ValueError("Username contains invalid characters")

        if not isinstance(password, str):
            raise ValueError("Password must be a string")
        password = password.replace("\x00", "")
        if not password:
            raise ValueError("Password cannot be empty")
        if len(password) > MAX_PASSWORD_LENGTH:
            raise ValueError(f"Password too long (max {MAX_PASSWORD_LENGTH} characters)")

        return LoginRequest(username=username, password=password)

    except ValueError:
        raise
    except Exception as e:
        logger.warning(f"Login input validation failed: {str(e)}")
        raise ValueError("Invalid input data provided") from e
