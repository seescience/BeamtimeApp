#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/config.py
# ----------------------------------------------------------------------------------
# Purpose:
# This file is used to define the configuration settings for the Flask application.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


__all__ = ["Config", "DatabaseConfig"]


# Find the .env file in the parent directory
env_path = Path(__file__).resolve().parent.parent / ".env"

# Load the environment variables from the .env file
load_dotenv(dotenv_path=env_path)


class Config:
    """A class that includes the configuration settings for Flask."""

    SECRET_KEY = os.getenv("SECRET_KEY")


@dataclass
class DatabaseConfig:
    """A class that provides the configuration settings for the database."""

    _database_uri: str | None = field(init=False, compare=False, repr=False)

    def __post_init__(self) -> None:
        self._database_uri = os.getenv("DATABASE_URI")

    @property
    def database_uri(self) -> str | None:
        return self._database_uri
