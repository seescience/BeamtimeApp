#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/utils.py
# ----------------------------------------------------------------------------------
# Purpose:
# This file is used to define utility functions for the BeamtimeApp.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

from typing import Any, Dict, Optional


def to_dictionary(obj: Any) -> Dict[str, Any]:
    """Converts an object to a dictionary."""
    return {column: getattr(obj, column) for column in obj.__table__.columns.keys()}


def format_experiment_data(experiments: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
    """Formats experiment data."""
    return [
        {
            "id": exp.get("id", None),
            "title": exp.get("title", "N/A"),
            "run_id": exp.get("run_id", None),
            "beamline_id": exp.get("beamline_id", None),
            "proposal": exp.get("proposal", "N/A"),
            "process_status": exp.get("process_status", "N/A"),
            "user_folder": exp.get("user_folder", "N/A"),
        }
        for exp in experiments
    ]


def format_info_modification_time(info: list[Dict[str, Any]]) -> Optional[str]:
    """Formats the modification time of the info table."""
    if not info:
        return None
    modify_time = max(entry.get("modify_time", None) for entry in info)
    return modify_time.strftime("%Y-%m-%d %H:%M:%S") if modify_time else None
