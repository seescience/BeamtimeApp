#!/bin/bash
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: start_beamtime_app_devel.sh
# ----------------------------------------------------------------------------------
# Purpose: 
# This script is used to start the BeamtimeApp web application for local testing
# and development.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
# Copyright (C) 2025-2026 NSF SEES, USA
# ----------------------------------------------------------------------------------

# Build TypeScript before starting
echo "Building TypeScript..."
npm run build

# Start the Flask application
uv run BeamtimeApp.py -d -p 5001