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
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from beamtime_app import database_config


__all__ = ["BASE", "session_scope", "DBException"]


# Create the database engine and session
ENGINE = create_engine(database_config.database_uri, pool_size=10, max_overflow=2, pool_timeout=30)
SESSION = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=ENGINE))

# Create the base class for the database models
BASE = declarative_base()


@contextmanager
def session_scope():
    """Provides a context manager to handle the database session."""
    session = SESSION()
    try:
        yield session
        session.commit()
    finally:
        session.close()


class DBException(Exception):
    """Database exception class."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(self.message)

    def __str__(self) -> str:
        return self.message
