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

import logging

from sqlalchemy import insert, update
from sqlalchemy.future import select
from sqlalchemy.orm import Session, aliased

from beamtime_app.database import session_scope
from beamtime_app.models import (
    APSBeamline,
    BaseModel,
    Experiment,
    Info,
    Person,
    ProcessStatus,
    ProcessStatusEnum,
    Queue,
    Technique,
)
from beamtime_app.utils import format_experiment_data, to_dictionary

logger = logging.getLogger(__name__)

__all__ = ["add_to_queue", "get_all_entries", "get_experiments", "get_info_value"]


def _select_all(db: Session, model: BaseModel) -> list[BaseModel]:
    """Returns all entries for a given model."""
    return db.execute(select(model)).scalars().all()


def get_all_entries(model: BaseModel) -> list[dict[str, any]]:
    with session_scope() as session:
        try:
            return [to_dictionary(entry) for entry in _select_all(session, model)]
        except Exception as e:
            logger.error(f"Error fetching entries for {getattr(model, '__name__', 'Unknown')}: {e}")
            return []


def get_info_value(key: str) -> str | None:
    with session_scope() as session:
        try:
            return session.execute(select(Info.value).where(Info.key == key)).scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching info value for {key}: {e}")
            return None


def get_experiments(
    run: int | None = None, beamline: int | None = None, station: int | None = None, technique: int | None = None, status: int | None = None
) -> list[dict[str, any]]:
    """Gets experiments with status from queue table (if queued) or experiment table status (if not queued)."""
    experiments = []
    technique_beamline_id = None

    with session_scope() as session:
        try:
            # If technique is specified, get its beamline_id first
            if technique:
                technique_beamline_id = session.execute(select(Technique.beamline_id).where(Technique.id == technique)).scalar_one_or_none()
            
            # Join Experiment with ProcessStatus
            ExperimentPS = aliased(ProcessStatus)

            # Aliases for different person roles
            Spokesperson = aliased(Person)
            BeamlineContact = aliased(Person)
            BeamlineInfo = aliased(APSBeamline)

            query = (
                session.query(
                    Experiment.id,
                    Experiment.title,
                    Experiment.run_id,
                    Experiment.beamline_id,
                    Experiment.proposal_id,
                    Experiment.folder,
                    Experiment.process_status_id.label("exp_process_status_id"),
                    Experiment.description,
                    Experiment.start_date,
                    Experiment.end_date,
                    Experiment.sees_doi,
                    Experiment.aps_doi,
                    Experiment.esaf_pdf_file,
                    Experiment.pvlog_file,
                    # Person information
                    Spokesperson.first_name.label("spokesperson_first_name"),
                    Spokesperson.last_name.label("spokesperson_last_name"),
                    Spokesperson.email.label("spokesperson_email"),
                    BeamlineContact.first_name.label("beamline_contact_first_name"),
                    BeamlineContact.last_name.label("beamline_contact_last_name"),
                    BeamlineContact.email.label("beamline_contact_email"),
                    # Beamline information
                    BeamlineInfo.name.label("beamline_name"),
                    # Status information
                    ExperimentPS.name.label("exp_status_name"),
                    ExperimentPS.id.label("exp_status_id"),
                    Queue.id.label("queue_id"),
                )
                .outerjoin(Queue, Experiment.id == Queue.experiment_id)
                .outerjoin(ExperimentPS, Experiment.process_status_id == ExperimentPS.id)
                .outerjoin(Spokesperson, Experiment.spokesperson_id == Spokesperson.id)
                .outerjoin(
                    BeamlineContact,
                    Experiment.beamline_contact_id == BeamlineContact.id,
                )
                .outerjoin(BeamlineInfo, Experiment.beamline_id == BeamlineInfo.id)
            )

            results = query.all()

            # Convert results to dictionaries
            experiments = [
                {
                    "id": result.id,
                    "title": result.title,
                    "run_id": result.run_id,
                    "beamline_id": result.beamline_id,
                    "beamline_name": result.beamline_name,
                    "proposal_id": result.proposal_id,
                    "folder": result.folder,
                    "description": result.description,
                    "start_date": result.start_date,
                    "end_date": result.end_date,
                    "sees_doi": result.sees_doi,
                    "aps_doi": result.aps_doi,
                    "esaf_pdf_file": result.esaf_pdf_file,
                    "pvlog_file": result.pvlog_file,
                    # Person information
                    "spokesperson_name": f"{result.spokesperson_first_name or ''} {result.spokesperson_last_name or ''}".strip() or None,
                    "spokesperson_email": result.spokesperson_email,
                    "beamline_contact_name": f"{result.beamline_contact_first_name or ''} {result.beamline_contact_last_name or ''}".strip() or None,
                    "beamline_contact_email": result.beamline_contact_email,
                    # Experiment status information
                    "process_status": result.exp_status_name,
                    "process_status_id": result.exp_status_id,
                    "is_queued": bool(result.queue_id),
                }
                for result in results
            ]

        except Exception as e:
            logger.error(f"Error fetching experiments: {e}")

    # Apply filters
    if beamline:
        experiments = [exp for exp in experiments if exp["beamline_id"] == beamline]
    if technique and technique_beamline_id:
        # When technique is selected, filter experiments by the technique's beamline_id
        experiments = [exp for exp in experiments if exp["beamline_id"] == technique_beamline_id]
    if run:
        experiments = [exp for exp in experiments if exp["run_id"] == run]
    if status:
        # Filter by status - can be either queue status or experiment status
        experiments = [exp for exp in experiments if exp["process_status_id"] == status]

    # Format the data using the existing formatter
    return format_experiment_data(experiments)


def add_to_queue(rows: list[dict[str, any]]) -> dict[str, int]:
    """Adds multiple rows to the queue table and updates experiment status to pending."""
    success_count = 0
    failure_count = 0

    # Normalize values for NOT NULL text columns (empty string, not NULL)
    sanitized_rows = []
    for row in rows:
        sanitized = {}
        for key, value in row.items():
            if key == "acknowledgments" and isinstance(value, list):
                sanitized[key] = ",".join(map(str, value))
            elif key in ("data_path", "pvlog_path", "acknowledgments") and value in (None, "N/A", ""):
                sanitized[key] = ""
            elif value == "N/A":
                sanitized[key] = None
            else:
                sanitized[key] = value
        sanitized_rows.append(sanitized)

    with session_scope() as session:
        try:
            # First, update the experiment status for each experiment being queued
            for row in sanitized_rows:
                experiment_id = row.get("experiment_id")
                if experiment_id:
                    # Get the current process_status_id first
                    current_experiment = session.execute(select(Experiment.process_status_id).where(Experiment.id == experiment_id)).scalar_one_or_none()

                    if current_experiment is not None:
                        # Update experiment: store current status in old_process_status_id and set status to pending
                        session.execute(
                            update(Experiment)
                            .where(Experiment.id == experiment_id)
                            .values(old_process_status_id=current_experiment, process_status_id=ProcessStatusEnum.PENDING)
                        )

            # Then insert the rows into the queue
            session.execute(insert(Queue), sanitized_rows)
            session.commit()
            success_count = len(sanitized_rows)
        except Exception as e:
            logger.error(f"Failed to add rows to queue: {e}")
            session.rollback()
            failure_count = len(sanitized_rows)

    return {"success": success_count, "failure": failure_count}
