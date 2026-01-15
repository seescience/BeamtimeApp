#!/bin/bash
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: start_beamtime_app.sh
# ----------------------------------------------------------------------------------
# Purpose: 
# This script is used to start the BeamtimeApp web application.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
# Copyright (C) 2025-2026 NSF SEES, USA
# ----------------------------------------------------------------------------------

# Start the Flask application
uv run BeamtimeApp.py & > /dev/null 2>&1