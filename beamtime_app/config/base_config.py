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
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
    TESTING = os.getenv("TESTING", "false").lower() == "true"

    # Session configuration
    PERMANENT_SESSION_LIFETIME_HOURS = int(os.getenv("PERMANENT_SESSION_LIFETIME", "8"))
    PERMANENT_SESSION_LIFETIME = timedelta(hours=PERMANENT_SESSION_LIFETIME_HOURS)
    SESSION_PERMANENT = os.getenv("SESSION_PERMANENT", "true").lower() == "true"
    SESSION_COOKIE_HTTPONLY = os.getenv("SESSION_COOKIE_HTTPONLY", "true").lower() == "true"
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "beamtime_session")

    # Database configuration
    DATABASE_URI = os.getenv("DATABASE_URI")

    # Local development bypass LDAP and accept any login credentials in development mode
    DEV_AUTH_BYPASS = os.getenv("DEV_AUTH_BYPASS", "false").lower() == "true"

    # LDAP configuration (all optional — not required when DEV_AUTH_BYPASS=True)
    LDAP_HOST = os.getenv("LDAP_HOST")
    LDAP_PORT = int(os.getenv("LDAP_PORT", "389"))
    LDAP_USE_SSL = os.getenv("LDAP_USE_SSL", "false").lower() == "true"
    LDAP_USE_TLS = os.getenv("LDAP_USE_TLS", "false").lower() == "true"
    LDAP_BIND_DN = os.getenv("LDAP_BIND_DN")
    LDAP_BIND_PASSWORD = os.getenv("LDAP_BIND_PASSWORD")
    LDAP_USER_DN = os.getenv("LDAP_USER_DN")
    LDAP_USER_LOGIN_ATTR = os.getenv("LDAP_USER_LOGIN_ATTR", "sAMAccountName")
    LDAP_USER_FIRST_NAME_ATTR = os.getenv("LDAP_USER_FIRST_NAME_ATTR", "givenName")
    LDAP_USER_LAST_NAME_ATTR = os.getenv("LDAP_USER_LAST_NAME_ATTR", "sn")
    LDAP_REQUIRE_GROUP = os.getenv("LDAP_REQUIRE_GROUP", "false").lower() == "true"
    LDAP_AUTHORIZED_GROUPS = os.getenv("LDAP_AUTHORIZED_GROUPS")

    # Logging configuration
    FLASK_LOG_FILE = os.getenv("FLASK_LOG_FILE", "logs/beamtime_app.log")
