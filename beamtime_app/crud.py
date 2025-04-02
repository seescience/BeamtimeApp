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
from sqlalchemy import insert
from typing import List, Dict, Any

from beamtime_app.models import BaseModel, Queue
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


def add_to_queue(rows: List[Dict[str, Any]]) -> Dict[str, int]:
    """Adds multiple rows to the queue table."""
    success_count = 0
    failure_count = 0

    # Convert "N/A" values to None and handle acknowledgments as a comma-separated string
    sanitized_rows = [
        {
            key: (None if value == "N/A" else ",".join(map(str, value)) if key == "acknowledgments" and isinstance(value, list) else value)
            for key, value in row.items()
        }
        for row in rows
    ]

    with session_scope() as session:
        try:
            session.execute(insert(Queue), sanitized_rows)
            session.commit()
            success_count = len(sanitized_rows)
        except Exception as e:
            print(f"Failed to add rows to queue: {e}")
            failure_count = len(sanitized_rows)

    return {"success": success_count, "failure": failure_count}
