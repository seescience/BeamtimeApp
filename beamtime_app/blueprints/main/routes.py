#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/blueprints/main/routes.py
# ----------------------------------------------------------------------------------
# Purpose:
# This file defines the main application routes
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

from flask import Blueprint, redirect, request, url_for

__all__ = ["main"]

# Create main blueprint
main = Blueprint("main", __name__)


@main.route("/")
def home() -> str:
    """Main application home - forwards to API v1."""
    # Forward all query parameters to /api/v1/
    return redirect(url_for("api_v1.home", **request.args))
