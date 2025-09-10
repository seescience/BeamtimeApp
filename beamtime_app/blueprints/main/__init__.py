#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/blueprints/main/__init__.py
# ----------------------------------------------------------------------------------
# Purpose:
# This is the main blueprints for the Beamtime application.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

from beamtime_app.blueprints.main.routes import main

__all__ = ["main"]
