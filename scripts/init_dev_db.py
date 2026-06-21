#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: scripts/init_dev_db.py
# ----------------------------------------------------------------------------------
# Purpose:
# This script creates and seeds a local SQLite database for BeamtimeApp development.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

import argparse
import datetime
from pathlib import Path

from dotenv import load_dotenv

__all__ = ["init_db", "main"]

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = PROJECT_ROOT / "dev" / "beamtime_dev.db"
DEV_BEAMLINE_NAME = "13-ID-D"
DEV_TECHNIQUE_USER = "13idd"


def _ensure_environment() -> None:
    """Load environment variables before importing beamtime_app."""
    load_dotenv(PROJECT_ROOT / ".env")
    load_dotenv(PROJECT_ROOT / ".env.dev")


def _setup_dev_directories() -> dict[str, str]:
    """Create local upload and PVLogger template directories for development."""
    uploads_dir = PROJECT_ROOT / "dev" / "uploads"
    templates_dir = PROJECT_ROOT / "dev" / "pvlog_templates" / DEV_BEAMLINE_NAME

    uploads_dir.mkdir(parents=True, exist_ok=True)
    templates_dir.mkdir(parents=True, exist_ok=True)

    template_file = templates_dir / "default.yaml"
    if not template_file.exists():
        template_file.write_text(
            "# Mock PVLogger template for local development\n"
            f"beamline: {DEV_BEAMLINE_NAME}\n"
            "channels: []\n",
            encoding="utf-8",
        )

    fixture_file = PROJECT_ROOT / "test_pvlog.yaml"
    template_fixture = templates_dir / "test_pvlog.yaml"
    if fixture_file.is_file() and not template_fixture.exists():
        template_fixture.write_text(fixture_file.read_text(encoding="utf-8"), encoding="utf-8")

    return {
        "uploads": str(uploads_dir),
        "pvlog_templates": str(PROJECT_ROOT / "dev" / "pvlog_templates"),
    }


def init_db(db_path: Path, force: bool) -> Path:
    """Create the database schema and seed development data."""
    _ensure_environment()

    from sqlalchemy import Integer, String, Text, create_engine
    from sqlalchemy.orm import Mapped, mapped_column, sessionmaker

    from beamtime_app.database import BASE
    from beamtime_app.models import (
        APSBeamline,
        Acknowledgment,
        Experiment,
        Info,
        Person,
        ProcessStatus,
        ProcessStatusEnum,
        Run,
        Technique,
    )

    class Institution(BASE):
        """Minimal stub for person.affiliation_id foreign key."""

        __tablename__ = "institution"

        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        name: Mapped[str] = mapped_column(String(255))

    class UserLevel(BASE):
        """Minimal stub for person.user_level_id foreign key."""

        __tablename__ = "user_level"

        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        name: Mapped[str] = mapped_column(String(64))

    class EsafType(BASE):
        """Minimal stub for experiment.esaf_type_id foreign key."""

        __tablename__ = "esaf_type"

        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        name: Mapped[str] = mapped_column(String(64))

    class EsafStatus(BASE):
        """Minimal stub for experiment.esaf_status_id foreign key."""

        __tablename__ = "esaf_status"

        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        name: Mapped[str] = mapped_column(String(64))

    class Beamline(BASE):
        """Minimal stub for experiment.beamline_id foreign key."""

        __tablename__ = "beamline"

        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        name: Mapped[str] = mapped_column(String(64))

    class Proposal(BASE):
        """Minimal stub for experiment.proposal_id foreign key."""

        __tablename__ = "proposal"

        id: Mapped[int] = mapped_column(Integer, primary_key=True)
        title: Mapped[str] = mapped_column(Text)

    def seed(session) -> None:
        """Insert mock development data into the database session."""
        now = datetime.datetime.now()
        paths = _setup_dev_directories()

        session.add_all(
            [
                # Reference tables required by foreign keys
                Institution(id=1, name="University of Chicago"),
                Institution(id=2, name="Argonne National Laboratory"),
                UserLevel(id=1, name="User"),
                UserLevel(id=2, name="Beamline Staff"),
                EsafType(id=1, name="Standard"),
                EsafStatus(id=1, name="Approved"),
                Beamline(id=1, name=DEV_BEAMLINE_NAME),
                Proposal(id=1, title="BeamtimeApp development and testing"),
                APSBeamline(id=1, name=DEV_BEAMLINE_NAME),
                Run(id=1, name="2025-3"),
                Run(id=2, name="2026-1"),
                ProcessStatus(id=ProcessStatusEnum.NEW, name="New"),
                ProcessStatus(id=ProcessStatusEnum.PENDING, name="Pending"),
                ProcessStatus(id=ProcessStatusEnum.MODIFIED, name="Modified"),
                ProcessStatus(id=ProcessStatusEnum.PROCESSED, name="Processed"),
                ProcessStatus(id=ProcessStatusEnum.LOCKED, name="Locked"),
                ProcessStatus(id=ProcessStatusEnum.ERROR, name="Error"),
                # Persons
                Person(
                    id=1,
                    badge=553157,
                    first_name="Christofanis",
                    last_name="Skordas",
                    email="cskordas@uchicago.edu",
                    orcid="",
                    affiliation_id=1,
                    user_level_id=2,
                ),
                Person(
                    id=2,
                    badge=100002,
                    first_name="13IDD",
                    last_name="Support",
                    email="13idd@gsecars.uchicago.edu",
                    orcid="",
                    affiliation_id=2,
                    user_level_id=2,
                ),
                # Techniques
                Technique(
                    id=1,
                    name=DEV_BEAMLINE_NAME,
                    base_dir="/data/{year}/{run}/skordas",
                    user_name=DEV_TECHNIQUE_USER,
                    pvlog_template="default.yaml",
                    beamline_id=1,
                    station="D",
                ),
                # Acknowledgments
                Acknowledgment(
                    id=1,
                    title="APS",
                    text="Use of the Advanced Photon Source, an Office of Science User Facility operated for the U.S. DOE by Argonne National Laboratory.",
                ),
                Acknowledgment(
                    id=2,
                    title="GSECARS",
                    text="GeoSoilEnviroCARS is supported by NSF Earth Sciences and DOE Geosciences.",
                ),
                # Info table
                Info(
                    key="current_run_id",
                    value="1",
                    notes="Default run filter for local development",
                    modify_time=now,
                    create_time=now,
                    display_order=1,
                ),
                Info(
                    key="uploads_directory",
                    value=paths["uploads"],
                    notes="Local dev uploads directory",
                    modify_time=now,
                    create_time=now,
                    display_order=2,
                ),
                Info(
                    key="pvlog_templates_directory",
                    value=paths["pvlog_templates"],
                    notes="Local dev PVLogger templates",
                    modify_time=now,
                    create_time=now,
                    display_order=3,
                ),
                # Experiments
                Experiment(
                    id=301,
                    time_request=1,
                    run_id=1,
                    esaf_type_id=1,
                    esaf_status_id=1,
                    beamline_id=1,
                    proposal_id=1,
                    spokesperson_id=1,
                    beamline_contact_id=2,
                    title="13IDD dev experiment - active beamtime",
                    description="Local dev mock ESAF for Christofanis Skordas on 13-ID-D.",
                    start_date=now - datetime.timedelta(days=1),
                    end_date=now + datetime.timedelta(days=4),
                    folder="2025-3/13-ID-D/301",
                    sees_doi="",
                    aps_doi="",
                    esaf_pdf_file="",
                    proposal_pdf_file="",
                    pvlog_file="",
                    process_status_id=ProcessStatusEnum.NEW,
                    old_process_status_id=ProcessStatusEnum.NEW,
                ),
                Experiment(
                    id=302,
                    time_request=1,
                    run_id=1,
                    esaf_type_id=1,
                    esaf_status_id=1,
                    beamline_id=1,
                    proposal_id=1,
                    spokesperson_id=1,
                    beamline_contact_id=2,
                    title="13IDD dev experiment - queued",
                    description="Second mock ESAF with DOI and PVLogger file for UI testing.",
                    start_date=now - datetime.timedelta(days=2),
                    end_date=now + datetime.timedelta(days=2),
                    folder="2025-3/13-ID-D/302",
                    sees_doi="10.1234/dev.302",
                    aps_doi="10.1234/aps.302",
                    esaf_pdf_file="",
                    proposal_pdf_file="",
                    pvlog_file="pvlog_302.yaml",
                    process_status_id=ProcessStatusEnum.PENDING,
                    old_process_status_id=ProcessStatusEnum.NEW,
                ),
                Experiment(
                    id=303,
                    time_request=1,
                    run_id=2,
                    esaf_type_id=1,
                    esaf_status_id=1,
                    beamline_id=1,
                    proposal_id=1,
                    spokesperson_id=1,
                    beamline_contact_id=2,
                    title="13IDD upcoming run experiment",
                    description="Future mock ESAF for run 2026-1.",
                    start_date=now + datetime.timedelta(days=14),
                    end_date=now + datetime.timedelta(days=18),
                    folder="2026-1/13-ID-D/303",
                    sees_doi="",
                    aps_doi="",
                    esaf_pdf_file="",
                    proposal_pdf_file="",
                    pvlog_file="",
                    process_status_id=ProcessStatusEnum.NEW,
                    old_process_status_id=ProcessStatusEnum.NEW,
                ),
            ]
        )

    db_path.parent.mkdir(parents=True, exist_ok=True)

    if db_path.exists():
        if not force:
            raise SystemExit(f"Database already exists at {db_path}. Use --force to recreate it.")
        db_path.unlink()

    engine = create_engine(f"sqlite:///{db_path.resolve()}")
    BASE.metadata.create_all(engine)

    session = sessionmaker(bind=engine)()
    try:
        seed(session)
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
        engine.dispose()

    return db_path


def main() -> None:
    """Main entry point for the development database initialization script."""
    parser = argparse.ArgumentParser(description="Initialize a local SQLite database for development.")
    parser.add_argument(
        "--db-path",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"Output SQLite file path (default: {DEFAULT_DB_PATH})",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Recreate the database if it already exists.",
    )
    args = parser.parse_args()

    db_path = init_db(args.db_path.resolve(), args.force)
    print(f"Created dev database: {db_path}")
    print(f"DATABASE_URI=sqlite:///{db_path.resolve()}")


if __name__ == "__main__":
    main()
