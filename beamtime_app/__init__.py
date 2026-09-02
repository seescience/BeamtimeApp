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
from flask_login import LoginManager

from beamtime_app.config import BaseConfig
from beamtime_app.database import init_db
from beamtime_app.services import get_user_by_id

__all__ = ["create_flask_app"]


def create_flask_app() -> Flask:
    """Create and configure Flask application."""
    # Create the Flask app
    app = Flask(__name__)
    app.config.from_object(BaseConfig)

    # Setup logging
    if not app.debug and not app.testing:
        # Create directory for Flask log file if needed
        flask_log_path = Path(app.config["FLASK_LOG_FILE"])
        flask_log_path.parent.mkdir(parents=True, exist_ok=True)

        # Setup file handler
        file_handler = RotatingFileHandler(app.config["FLASK_LOG_FILE"], maxBytes=10240000, backupCount=10)
        file_handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)

        app.logger.setLevel(logging.INFO)
        app.logger.info("BeamtimeApp startup")

    # Initialize Flask Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message = "Please log in to access this page."
    login_manager.login_message_category = "info"

    @login_manager.user_loader
    def load_user(user_id):
        return get_user_by_id(user_id)

    # Initialize database
    init_db(app)

    # Import and register the routes
    from beamtime_app.blueprints import api_v1, auth, main

    app.register_blueprint(main)
    app.register_blueprint(auth)
    app.register_blueprint(api_v1)
    app.logger.info("Blueprints registered: main, auth, api_v1")

    # Log startup info
    app.logger.info("BeamtimeApp started")

    return app
