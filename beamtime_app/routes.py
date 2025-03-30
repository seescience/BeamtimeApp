#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/routes.py
# ----------------------------------------------------------------------------------
# Purpose:
# This file is used to define the routes for the BeamtimeApp.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

from flask import Blueprint, render_template


# Create a Blueprint for the beamtime routes
beamtime = Blueprint("beamtime", __name__)


@beamtime.route("/")
def home_route():
    return render_template("layout.html")
