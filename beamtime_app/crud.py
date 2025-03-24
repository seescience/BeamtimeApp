#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/crud.py
# ----------------------------------------------------------------------------------
# Purpose:
# This file is used to create, read, update and delete database entries for the app.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

from sqlalchemy.orm import Session
from sqlalchemy.future import select

from beamtime_app.models import BaseModel
from beamtime_app.database import session_scope, DBException
from beamtime_app.utils import to_dictionary


__all__ = ["get_all_entries"]


def _select_all(db: Session, model):
    """Returns all entries for a given model."""
    return db.execute(select(model)).scalars().all()


def get_all_entries(model: BaseModel):
    """Returns all entries for a given model."""
    entries = []

    with session_scope() as session:
        try:
            entries = [to_dictionary(entry) for entry in _select_all(session, model)]
        except DBException as e:
            # Temporary error. Switch to email alerts
            print(e)

    return entries
