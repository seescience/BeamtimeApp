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

import re
from pathlib import Path
from typing import Optional


def to_dictionary(obj: any) -> dict[str, any]:
    """Converts an object to a dictionary."""
    return {column: getattr(obj, column) for column in obj.__table__.columns.keys()}


def format_experiment_data(experiments: list[dict[str, any]]) -> list[dict[str, any]]:
    """Formats experiment data."""
    return [
        {
            "id": exp.get("id", None),
            "title": exp.get("title", "N/A"),
            "run_id": exp.get("run_id", None),
            "beamline_id": exp.get("beamline_id", None),
            "proposal": exp.get("proposal_id", "N/A"),
            "process_status": exp.get("process_status", "N/A"),
            "user_folder": exp.get("user_folder", "N/A"),
        }
        for exp in experiments
    ]


def format_info_modification_time(info: list[dict[str, any]]) -> Optional[str]:
    """Formats the modification time of the info table."""
    if not info:
        return None

    modify_time = max(
        (
            entry.get("modify_time")
            for entry in info
            if entry.get("modify_time") is not None
        ),
        default=None,
    )
    return modify_time.strftime("%Y-%m-%d %H:%M:%S") if modify_time else None


def validate_datapath(datapath: str) -> bool:
    """Validates if a datapath string is valid."""
    if not datapath or not isinstance(datapath, str):
        return False

    # Check for invalid characters, but allow colon for Windows drive letters
    invalid_chars = ["<", ">", '"', "|", "?", "*"]

    # Check if colon is in invalid position (not for Windows drive letters)
    if ":" in datapath:
        # Allow C: style drive letters at the beginning
        if not re.match(r"^[A-Za-z]:", datapath) and ":" in datapath:
            return False

    return not any(char in datapath for char in invalid_chars)


def normalize_datapath(datapath: str) -> str:
    """Normalizes a datapath by removing extra spaces and standardizing separators."""
    if not datapath:
        return ""

    # Remove extra whitespace and normalize path separators
    normalized = datapath.strip().replace("\\", "/")

    # Remove duplicate slashes
    while "//" in normalized:
        normalized = normalized.replace("//", "/")

    return normalized


def validate_and_normalize_datapath(datapath: str) -> dict[str, any]:
    """
    Validates and normalizes a datapath, returning validation results.

    This is a simplified version that only checks format validity.
    Returns:
        dict with 'valid', 'exists', 'normalized', 'message' keys
    """

    if not datapath or not isinstance(datapath, str):
        return {
            "valid": False,
            "exists": False,
            "normalized": "",
            "message": "Invalid or empty path",
        }

    # First validate the path format
    if not validate_datapath(datapath):
        return {
            "valid": False,
            "exists": False,
            "normalized": "",
            "message": "Path contains invalid characters",
        }

    # Normalize the path
    normalized = normalize_datapath(datapath)

    # Basic path existence check (simplified - only for local paths)
    exists = False
    try:
        # Only check existence if it looks like a local path
        if normalized and not normalized.startswith(
            ("http://", "https://", "ftp://", "sftp://")
        ):
            exists = Path(normalized).exists()
    except (OSError, ValueError):
        exists = False

    return {
        "valid": True,
        "exists": exists,
        "normalized": normalized,
        "message": "Path exists" if exists else "Path is valid",
    }
