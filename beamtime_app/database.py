#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/database.py
# ----------------------------------------------------------------------------------
# Purpose:
# This file is used to define the database configuration for the BeamtimeApp.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
# Copyright (C) 2025-2026 NSF SEES, USA
# ----------------------------------------------------------------------------------

from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker

__all__ = ["BASE", "session_scope", "DBException", "init_db"]


# Global variables for engine and session
ENGINE = None
SESSION = None

# Create the base class for the database models
BASE = declarative_base()


def init_db(app) -> None:
    """Initialize database with Flask app."""
    global ENGINE, SESSION

    # Create the database engine
    ENGINE = create_engine(app.config["DATABASE_URI"], pool_size=10, max_overflow=2, pool_timeout=30)

    # Create session
    SESSION = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=ENGINE))

    app.logger.info("Database initialized")


def get_session() -> scoped_session:
    """Get database session."""
    if SESSION is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return SESSION


@contextmanager
def session_scope() -> scoped_session:
    """Provides a context manager to handle the database session."""
    session = get_session()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


class DBException(Exception):
    """Database exception class."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(self.message)

    def __str__(self) -> str:
        return self.message
