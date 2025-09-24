#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/blueprints/api/v1/__init__.py
# ----------------------------------------------------------------------------------
# Purpose:
# This is the API v1 blueprints for the Beamtime application.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

from beamtime_app.blueprints.api.v1.routes import api_v1

__all__ = ["api_v1"]
