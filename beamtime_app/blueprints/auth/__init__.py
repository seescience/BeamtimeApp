#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/blueprints/auth/__init__.py
# ----------------------------------------------------------------------------------
# Purpose:
# This is the auth blueprints for the Beamtime application.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
# Copyright (C) 2025-2026 NSF SEES, USA
# ----------------------------------------------------------------------------------

from beamtime_app.blueprints.auth.routes import auth

__all__ = ["auth"]
