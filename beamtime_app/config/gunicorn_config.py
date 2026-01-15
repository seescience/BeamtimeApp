#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/config/gunicorn_config.py
# ----------------------------------------------------------------------------------
# Purpose:
# This is the Gunicorn configuration file for the Beamtime application.
# It sets the number of workers, worker class, and other settings for the
# Gunicorn server.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
# Copyright (C) 2025-2026 NSF SEES, USA
# ----------------------------------------------------------------------------------

import os
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration options
bind = os.getenv("GUNICORN_BIND")
workers = int(os.getenv("GUNICORN_WORKERS"))
timeout = int(os.getenv("GUNICORN_TIMEOUT"))
graceful_timeout = int(os.getenv("GUNICORN_GRACEFUL_TIMEOUT"))
accesslog = os.getenv("GUNICORN_ACCESS_LOG")
errorlog = os.getenv("GUNICORN_ERROR_LOG")

# Create directories for log files if needed
if accesslog:
    Path(accesslog).parent.mkdir(parents=True, exist_ok=True)
if errorlog:
    Path(errorlog).parent.mkdir(parents=True, exist_ok=True)
