#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/models.py
# ----------------------------------------------------------------------------------
# Purpose:
# This file is used to define the data models for the BeamtimeApp.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

import datetime
from dataclasses import dataclass, field
from typing import Any, Dict

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from beamtime_app.database import BASE

__all__ = ["Acknowledgment", "Beamline", "DataPath", "Experiment", "Info", "Person", "ProcessStatus", "Queue", "Run", "Station", "Technique"]


class BaseModel:
    """Base class for the data models."""

    _columns: Dict[str, Any] = field(default_factory=dict)

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} - {', '.join(f'{k}: {v}' for k, v in self._columns.items())}>"


@dataclass
class Info(BASE, BaseModel):
    """Model for the beamtime database information."""

    __tablename__ = "info"

    key: Mapped[str] = mapped_column(Text, primary_key=True, unique=True)
    value: Mapped[str] = mapped_column(Text)
    notes: Mapped[str] = mapped_column(Text)
    modify_time: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.now)
    create_time: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.now)
    display_order: Mapped[int] = mapped_column(Integer)

    def __post_init__(self) -> None:
        self._columns = {
            "key": self.key,
            "value": self.value,
            "notes": self.notes,
            "modify_time": self.modify_time,
            "create_time": self.create_time,
            "display_order": self.display_order,
        }


@dataclass
class Run(BASE, BaseModel):
    """Model for the beamtime runs."""

    __tablename__ = "run"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64))

    def __post_init__(self) -> None:
        self._columns = {"id": self.id, "name": self.name}


@dataclass
class Beamline(BASE, BaseModel):
    """Model for the beamlines."""

    __tablename__ = "beamline"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64))

    def __post_init__(self) -> None:
        self._columns = {"id": self.id, "name": self.name}


@dataclass
class Technique(BASE, BaseModel):
    """Model for the techniques."""

    __tablename__ = "technique"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(512))

    def __post_init__(self) -> None:
        self._columns = {"id": self.id, "name": self.name}


@dataclass
class Station(BASE, BaseModel):
    """Model for the stations."""

    __tablename__ = "station"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)

    def __post_init__(self) -> None:
        self._columns = {"id": self.id, "name": self.name}


@dataclass
class Acknowledgment(BASE, BaseModel):
    """Model for the acknowledgments."""

    __tablename__ = "acknowledgment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    text: Mapped[str] = mapped_column(Text)

    def __post_init__(self) -> None:
        self._columns = {"id": self.id, "title": self.title, "text": self.text}


@dataclass
class Person(BASE, BaseModel):
    """Model for the persons."""

    __tablename__ = "person"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    badge: Mapped[int] = mapped_column(Integer)
    first_name: Mapped[str] = mapped_column(Text)
    last_name: Mapped[str] = mapped_column(Text)
    email: Mapped[str] = mapped_column(Text)
    orcid: Mapped[str] = mapped_column(String(64))
    affiliation_id: Mapped[int] = mapped_column(Integer, ForeignKey("institution.id"))
    user_level_id: Mapped[int] = mapped_column(Integer, ForeignKey("user_level.id"))

    def __post_init__(self) -> None:
        self._columns = {
            "id": self.id,
            "badge": self.badge,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "orcid": self.orcid,
            "affiliation_id": self.affiliation_id,
            "user_level_id": self.user_level_id,
        }


@dataclass
class Experiment(BASE, BaseModel):
    """Model for the experiments."""

    __tablename__ = "experiment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    time_request: Mapped[int] = mapped_column(Integer)
    run_id: Mapped[int] = mapped_column(Integer, ForeignKey("run.id"))
    esaf_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("esaf_type.id"))
    esaf_status_id: Mapped[int] = mapped_column(Integer, ForeignKey("esaf_status.id"))
    beamline_id: Mapped[int] = mapped_column(Integer, ForeignKey("beamline.id"))
    proposal_id: Mapped[int] = mapped_column(Integer, ForeignKey("proposal.id"))
    spokesperson_id: Mapped[int] = mapped_column(Integer, ForeignKey("person.id"))
    beamline_contact_id: Mapped[int] = mapped_column(Integer, ForeignKey("person.id"))
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    start_date: Mapped[datetime.datetime] = mapped_column(DateTime)
    end_date: Mapped[datetime.datetime] = mapped_column(DateTime)
    user_folder: Mapped[str] = mapped_column(Text)
    data_doi: Mapped[str] = mapped_column(Text)
    esaf_pdf_file: Mapped[str] = mapped_column(Text)
    proposal_pdf_file: Mapped[str] = mapped_column(Text)
    folder_status_id: Mapped[int] = mapped_column(Integer)
    process_status_id: Mapped[int] = mapped_column(Integer)

    def __post_init__(self) -> None:
        self._columns = {
            "id": self.id,
            "time_request": self.time_request,
            "run_id": self.run_id,
            "esaf_type_id": self.esaf_type_id,
            "esaf_status_id": self.esaf_status_id,
            "beamline_id": self.beamline_id,
            "proposal_id": self.proposal_id,
            "spokesperson_id": self.spokesperson_id,
            "beamline_contact_id": self.beamline_contact_id,
            "title": self.title,
            "description": self.description,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "user_folder": self.user_folder,
            "data_doi": self.data_doi,
            "esaf_pdf_file": self.easf_pdf_file,
            "proposal_pdf_file": self.proposal_pdf_file,
            "folder_status_id": self.folder_status_id,
            "process_status": self.process_status,
        }


@dataclass
class ProcessStatus(BASE, BaseModel):
    """Model for the process status."""

    __tablename__ = "process_status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64))

    def __post_init__(self) -> None:
        self._columns = {"id": self.id, "name": self.name}


@dataclass
class Queue(BASE, BaseModel):
    """Model for the queue."""

    __tablename__ = "queue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    experiment_number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(Text)
    data_path: Mapped[str] = mapped_column(Text)
    pvlog_path: Mapped[str] = mapped_column(Text)
    doi: Mapped[bool] = mapped_column()
    proposal_number: Mapped[int] = mapped_column(Integer)
    acknowledgments: Mapped[str] = mapped_column(Text)

    def __post_init__(self) -> None:
        self._columns = {
            "id": self.id,
            "experiment_number": self.experiment_number,
            "title": self.title,
            "data_path": self.data_path,
            "pvlog_path": self.pvlog_path,
            "doi": self.doi,
            "proposal_number": self.proposal_number,
            "acknowledgments": self.acknowledgments,
        }

@dataclass
class DataPath(BASE, BaseModel):
    """Model for the data paths."""

    __tablename__ = "data_path"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    path_template: Mapped[str] = mapped_column(Text)
    station_id: Mapped[int] = mapped_column(Integer, ForeignKey("station.id"))
    technique_id: Mapped[int] = mapped_column(Integer, ForeignKey("technique.id"))

    def __post_init__(self) -> None:
        self._columns = {
            "id": self.id,
            "path_template": self.path_template,
            "station_id": self.station_id,
            "technique_id": self.technique_id,
        }
