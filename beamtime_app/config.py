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


# Find the .env file in the parent directory
env_path = Path(__file__).resolve().parent.parent / ".env"

# Load the environment variables from the .env file
load_dotenv(dotenv_path=env_path)


class Config:
    """A class that includes the configuration settings for Flask."""

    SECRET_KEY = os.getenv("SECRET_KEY")


@dataclass
class BeamlineConfig:
    """A class that provides the configuration settings for each running beamline."""

    _beamline: str | None = field(init=False, compare=False, repr=False)
    _default_path: str | None = field(init=False, compare=False, repr=False)

    def __post_init__(self) -> None:
        self._beamline = os.getenv("BEAMLINE")
        self._default_path = os.getenv("DEFAULT_PATH")

    @property
    def beamline(self) -> str | None:
        return self._beamline

    @property
    def default_path(self) -> str | None:
        return self._default_path
