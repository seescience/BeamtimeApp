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
from typing import Dict, Any

from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, PrimaryKeyConstraint
from sqlalchemy.orm import Mapped, mapped_column

from beamtime_app.database import BASE


__all__ = [
    "Info",
    "Message",
    "UserType",
    "UserLevel",
    "EsafType",
    "EsafStatus",
    "Institution",
    "Funding",
    "Run",
    "Beamline",
    "Technique",
    "Acknowledgment",
    "Person",
    "Proposal",
    "Experiment",
    "ExperimentPerson",
    "ExperimentTechnique",
    "ExperimentFunding",
    "ExperimentAcknowledgment",
]


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
class Message(BASE, BaseModel):
    """Model for the messages."""

    __tablename__ = "message"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    text: Mapped[str] = mapped_column(Text)
    modify_time: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.now)

    def __post_init__(self) -> None:
        self._columns = {"id": self.id, "text": self.text, "modify_time": self.modify_time}


@dataclass
class UserType(BASE, BaseModel):
    """Model for the available user types."""

    __tablename__ = "user_type"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64))

    def __post_init__(self) -> None:
        self._columns = {"id": self.id, "name": self.name}


@dataclass
class UserLevel(BASE, BaseModel):
    """Model for the available user levels."""

    __tablename__ = "user_level"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64))

    def __post_init__(self) -> None:
        self._columns = {"id": self.id, "name": self.name}


@dataclass
class EsafType(BASE, BaseModel):
    """Model for the available ESAF types."""

    __tablename__ = "esaf_type"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64))

    def __post_init__(self) -> None:
        self._columns = {"id": self.id, "name": self.name}


@dataclass
class EsafStatus(BASE, BaseModel):
    """Model for the available ESAF statuses."""

    __tablename__ = "esaf_status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64))

    def __post_init__(self) -> None:
        self._columns = {"id": self.id, "name": self.name}


@dataclass
class Institution(BASE, BaseModel):
    """Model for the institutions."""

    __tablename__ = "institution"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(2048))
    city: Mapped[str] = mapped_column(String(512))
    country: Mapped[str] = mapped_column(String(512))

    def __post_init__(self) -> None:
        self._columns = {"id": self.id, "name": self.name, "city": self.city, "country": self.country}


@dataclass
class Funding(BASE, BaseModel):
    """Model for the funding sources."""

    __tablename__ = "funding"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    agency: Mapped[str] = mapped_column(String(512))
    division: Mapped[str] = mapped_column(String(512))
    grant_number: Mapped[str] = mapped_column(String(512))

    def __post_init__(self) -> None:
        self._columns = {"id": self.id, "agency": self.agency, "division": self.division, "grant_number": self.grant_number}


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
class Proposal(BASE, BaseModel):
    """Model for the proposals."""

    __tablename__ = "proposal"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    spokesperson_id: Mapped[int] = mapped_column(Integer, ForeignKey("person.id"))

    def __post_init__(self) -> None:
        self._columns = {
            "id": self.id,
            "title": self.title,
            "spokesperson_id": self.spokesperson_id,
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
    pvlog_template_file: Mapped[str] = mapped_column(Text)
    easf_pdf_file: Mapped[str] = mapped_column(Text)
    proposal_pdf_file: Mapped[str] = mapped_column(Text)

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
            "pvlog_template_file": self.pvlog_template_file,
            "easf_pdf_file": self.easf_pdf_file,
            "proposal_pdf_file": self.proposal_pdf_file,
        }


@dataclass
class ExperimentPerson(BASE, BaseModel):
    """Model for the experiment persons."""

    __tablename__ = "experiment_person"
    __table_args__ = (PrimaryKeyConstraint("experiment_id", "person_id"),)

    experiment_id: Mapped[int] = mapped_column(Integer, ForeignKey("experiment.id"))
    person_id: Mapped[int] = mapped_column(Integer, ForeignKey("person.id"))
    user_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("user_type.id"))

    def __post_init__(self) -> None:
        self._columns = {"experiment_id": self.experiment_id, "person_id": self.person_id, "user_type_id": self.user_type_id}


@dataclass
class ExperimentTechnique(BASE, BaseModel):
    """Model for the experiment techniques."""

    __tablename__ = "experiment_technique"
    __table_args__ = (PrimaryKeyConstraint("experiment_id", "technique_id"),)

    experiment_id: Mapped[int] = mapped_column(Integer, ForeignKey("experiment.id"))
    technique_id: Mapped[int] = mapped_column(Integer, ForeignKey("technique.id"))

    def __post_init__(self) -> None:
        self._columns = {"experiment_id": self.experiment_id, "technique_id": self.technique_id}


@dataclass
class ExperimentFunding(BASE, BaseModel):
    """Model for the experiment fundings."""

    __tablename__ = "experiment_funding"
    __table_args__ = (PrimaryKeyConstraint("experiment_id", "funding_id"),)

    experiment_id: Mapped[int] = mapped_column(Integer, ForeignKey("experiment.id"))
    funding_id: Mapped[int] = mapped_column(Integer, ForeignKey("funding.id"))

    def __post_init__(self) -> None:
        self._columns = {"experiment_id": self.experiment_id, "funding_id": self.funding_id}


@dataclass
class ExperimentAcknowledgment(BASE, BaseModel):
    """Model for the experiment acknowledgments."""

    __tablename__ = "experiment_acknowledgment"
    __table_args__ = (PrimaryKeyConstraint("experiment_id", "acknowledgment_id"),)

    experiment_id: Mapped[int] = mapped_column(Integer, ForeignKey("experiment.id"))
    acknowledgment_id: Mapped[int] = mapped_column(Integer, ForeignKey("acknowledgment.id"))

    def __post_init__(self) -> None:
        self._columns = {"experiment_id": self.experiment_id, "acknowledgment_id": self.acknowledgment_id}
