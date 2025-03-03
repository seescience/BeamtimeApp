#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/__init__.py
# ----------------------------------------------------------------------------------
# Purpose:
# This is the main entry point for the Beamtime application. This file is used to
# configure the Flask application.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from flask import Flask

from beamtime_app.config import Config, BeamlineConfig, DatabaseConfig


__all__ = ["create_flask_app", "beamline_config", "database_config"]


# Get the beamline specific environment variables
beamline_config = BeamlineConfig()

# Create the database config instance
database_config = DatabaseConfig()

# Create the logs directory for the application
Path("logs").mkdir(exist_ok=True)

# Setup Flask logging
flask_logger = logging.getLogger("werkzeug")
flask_logger.setLevel(logging.INFO)
flask_handler = RotatingFileHandler("logs/flask.log", maxBytes=512 * 1024 * 1024, backupCount=1000000)
flask_handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
flask_logger.addHandler(flask_handler)


def create_flask_app(config_class=Config):
    """Create a Flask app using the provided configuration class."""
    # Create the Flask app
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Set the Flask logger
    app.logger = flask_logger

    # Import and register the routes
    from beamtime_app.routes import beamtime

    app.register_blueprint(beamtime)

    return app
