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

from typing import Any

from sqlalchemy import insert
from sqlalchemy.future import select
from sqlalchemy.orm import Session

from beamtime_app.database import DBException, session_scope
from beamtime_app.models import BaseModel, DataPath, Experiment, ProcessStatus, Queue
from beamtime_app.utils import format_experiment_data, to_dictionary

__all__ = ["add_to_queue", "get_all_entries"]


def _select_all(db: Session, model: BaseModel) -> list[BaseModel]:
    """Returns all entries for a given model."""
    return db.execute(select(model)).scalars().all()


def get_all_entries(model: BaseModel) -> list[dict[str, Any]]:
    """Returns all entries for a given model."""
    entries = []

    with session_scope() as session:
        try:
            entries = [to_dictionary(entry) for entry in _select_all(session, model)]
        except DBException as e:
            # Temporary error. Switch to email alerts
            print(e)

    return entries


def get_experiments(
    run: int | None = None, beamline: int | None = None
) -> list[dict[str, any]]:
    """Gets experiments with joined process status names."""
    experiments = []

    with session_scope() as session:
        try:
            # Join Experiment with ProcessStatus to get status names
            query = session.query(
                Experiment.id,
                Experiment.title,
                Experiment.run_id,
                Experiment.beamline_id,
                Experiment.proposal_id,
                Experiment.user_folder,
                ProcessStatus.name.label("process_status_name"),
            ).outerjoin(ProcessStatus, Experiment.process_status_id == ProcessStatus.id)

            results = query.all()

            # Convert results to dictionaries
            experiments = [
                {
                    "id": result.id,
                    "title": result.title,
                    "run_id": result.run_id,
                    "beamline_id": result.beamline_id,
                    "proposal_id": result.proposal_id,
                    "user_folder": result.user_folder,
                    "process_status": result.process_status_name or "Unknown",
                }
                for result in results
            ]

        except DBException as e:
            print(f"Error getting experiments: {e}")

    # Apply filters
    if beamline:
        experiments = [exp for exp in experiments if exp["beamline_id"] == beamline]
    if run:
        experiments = [exp for exp in experiments if exp["run_id"] == run]

    # Format the data using the existing formatter
    return format_experiment_data(experiments)


def add_to_queue(rows: list[dict[str, Any]]) -> dict[str, int]:
    """Adds multiple rows to the queue table."""
    success_count = 0
    failure_count = 0

    # Convert "N/A" values to None and handle acknowledgments as a comma-separated string
    sanitized_rows = [
        {
            key: (
                None
                if value == "N/A"
                else ",".join(map(str, value))
                if key == "acknowledgments" and isinstance(value, list)
                else value
            )
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


def get_data_path(station_id: int, technique_id: int) -> str:
    """Returns data path template string for a given station and technique."""
    with session_scope() as session:
        try:
            # Select the data path template for the given station id and technique id
            result = session.execute(
                select(DataPath.path_template).where(
                    DataPath.station_id == station_id,
                    DataPath.technique_id == technique_id,
                )
            )

            # Get the first result as a scalar value
            path_template = result.scalar_one_or_none()
            return path_template or ""

        except DBException as e:
            print(f"Error retrieving data path: {e}")
            return ""
