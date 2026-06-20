#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/config/base_config.py
# ----------------------------------------------------------------------------------
# Purpose:
# This file is used to define the configuration settings for the Flask application.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

import os
from datetime import timedelta

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class BaseConfig:
    """Application configuration class."""

    # Basic Flask config
    SECRET_KEY = os.getenv("SECRET_KEY")
    DEBUG = os.getenv("DEBUG").lower() == "true"
    TESTING = os.getenv("TESTING").lower() == "true"

    # Session configuration
    PERMANENT_SESSION_LIFETIME_HOURS = int(os.getenv("PERMANENT_SESSION_LIFETIME"))
    PERMANENT_SESSION_LIFETIME = timedelta(hours=PERMANENT_SESSION_LIFETIME_HOURS)
    SESSION_PERMANENT = os.getenv("SESSION_PERMANENT").lower() == "true"
    SESSION_COOKIE_HTTPONLY = os.getenv("SESSION_COOKIE_HTTPONLY").lower() == "true"
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE").lower() == "true"
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE")
    SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME")

    # Database configuration
    DATABASE_URI = os.getenv("DATABASE_URI")

    # Local development bypass LDAP and accept any login credentials in development mode
    DEV_AUTH_BYPASS = os.getenv("DEV_AUTH_BYPASS", "false").lower() == "true"

    # LDAP configuration
    LDAP_HOST = os.getenv("LDAP_HOST")
    LDAP_PORT = int(os.getenv("LDAP_PORT"))
    LDAP_USE_SSL = os.getenv("LDAP_USE_SSL").lower() == "true"
    LDAP_USE_TLS = os.getenv("LDAP_USE_TLS").lower() == "true"
    LDAP_BIND_DN = os.getenv("LDAP_BIND_DN")
    LDAP_BIND_PASSWORD = os.getenv("LDAP_BIND_PASSWORD")
    LDAP_USER_DN = os.getenv("LDAP_USER_DN")
    LDAP_USER_LOGIN_ATTR = os.getenv("LDAP_USER_LOGIN_ATTR")
    LDAP_USER_FIRST_NAME_ATTR = os.getenv("LDAP_USER_FIRST_NAME_ATTR")
    LDAP_USER_LAST_NAME_ATTR = os.getenv("LDAP_USER_LAST_NAME_ATTR")
    LDAP_REQUIRE_GROUP = os.getenv("LDAP_REQUIRE_GROUP").lower() == "true"
    LDAP_AUTHORIZED_GROUPS = os.getenv("LDAP_AUTHORIZED_GROUPS")

    # Logging configuration
    FLASK_LOG_FILE = os.getenv("FLASK_LOG_FILE")
