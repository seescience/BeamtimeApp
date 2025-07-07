#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/gunicorn_config.py
# ----------------------------------------------------------------------------------
# Purpose:
# This is the Gunicorn configuration file for the Beamtime application.
# It sets the number of workers, worker class, and other settings for the
# Gunicorn server.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

# Configuration options
bind = "0.0.0.0:19999"
workers = 6
timeout = 60
graceful_timeout = 30
accesslog = "logs/server_access.log"
errorlog = "logs/server_error.log"
