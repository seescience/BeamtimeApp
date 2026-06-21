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
    """Formats experiment data while preserving all fields."""
    return [
        {
            # Core fields for table display
            "id": exp.get("id", None),
            "title": exp.get("title", "N/A"),
            "run_id": exp.get("run_id", None),
            "beamline_id": exp.get("beamline_id", None),
            "proposal": exp.get("proposal_id", "N/A"),
            "process_status": exp.get("process_status", "N/A"),
            "folder": exp.get("folder", "N/A"),
            # Additional fields for view modal
            "beamline_name": exp.get("beamline_name", "N/A"),
            "description": exp.get("description", "N/A"),
            "start_date": exp.get("start_date"),
            "end_date": exp.get("end_date"),
            "sees_doi": exp.get("sees_doi", "N/A"),
            "aps_doi": exp.get("aps_doi", "N/A"),
            "pvlog_file": exp.get("pvlog_file", "N/A"),
            "esaf_pdf_file": exp.get("esaf_pdf_file", "N/A"),
            "spokesperson_name": exp.get("spokesperson_name", "N/A"),
            "spokesperson_email": exp.get("spokesperson_email", "N/A"),
            "beamline_contact_name": exp.get("beamline_contact_name", "N/A"),
            "beamline_contact_email": exp.get("beamline_contact_email", "N/A"),
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


def get_pvlog_allowed_roots() -> list[Path]:
    """Return absolute directories where PVLogger YAML files may be read or written."""
    from beamtime_app.crud import get_info_value

    roots = []
    for key in ("uploads_directory", "pvlog_templates_directory"):
        value = get_info_value(key)
        if value:
            roots.append(Path(value).resolve())
    return roots


def _pvlog_path_is_allowed(candidate: Path, roots: list[Path]) -> bool:
    resolved = candidate.resolve()
    return any(resolved == root or resolved.is_relative_to(root) for root in roots)


def resolve_pvlog_path(path: str) -> Optional[str]:
    """Resolve a PVLogger YAML path if it exists within an allowed directory."""
    if not path or not str(path).strip():
        return None

    candidate = Path(path)
    if not candidate.is_file():
        return None

    roots = get_pvlog_allowed_roots()
    if not _pvlog_path_is_allowed(candidate, roots):
        return None

    return str(candidate.resolve())


def resolve_pvlog_write_path(path: str) -> Optional[str]:
    """Resolve an exact PVLogger path for writing. No basename fallback."""
    return resolve_pvlog_path(path)


def resolve_pvlog_reference(path_or_name: str) -> Optional[str]:
    """Resolve a PVLogger file from a full path or a bare filename."""
    resolved = resolve_pvlog_path(path_or_name)
    if resolved:
        return resolved

    from beamtime_app.crud import get_info_value

    basename = Path(path_or_name).name
    uploads_dir = get_info_value("uploads_directory")
    if uploads_dir:
        resolved = resolve_pvlog_path(str(Path(uploads_dir) / basename))
        if resolved:
            return resolved

    templates_dir = get_info_value("pvlog_templates_directory")
    if templates_dir:
        templates_root = Path(templates_dir)
        if templates_root.is_dir():
            for beamline_dir in templates_root.iterdir():
                if beamline_dir.is_dir():
                    resolved = resolve_pvlog_path(str(beamline_dir / basename))
                    if resolved:
                        return resolved

    return None


def is_upload_pvlog_path(path: str) -> bool:
    """Return True when the path is inside the configured uploads directory."""
    from beamtime_app.crud import get_info_value

    uploads_dir = get_info_value("uploads_directory")
    if not uploads_dir:
        return False

    uploads_root = Path(uploads_dir).resolve()
    return Path(path).resolve().is_relative_to(uploads_root)


_QUEUE_PVLOG_PATTERN = re.compile(r"^pvlog_\d+\.(yaml|yml)$", re.IGNORECASE)


def is_queue_pvlog_path(path: str) -> bool:
    """Return True for the per-ESAF queue working copy in uploads."""
    if not is_upload_pvlog_path(path):
        return False
    return bool(_QUEUE_PVLOG_PATTERN.match(Path(path).name))


def is_upload_original_pvlog_path(path: str) -> bool:
    """Return True for an uploaded source file stored in uploads (not the queue copy)."""
    return is_upload_pvlog_path(path) and not is_queue_pvlog_path(path)


def queue_pvlog_filename(esaf_number: str) -> str:
    """Return the standard queue working-copy filename for an ESAF."""
    return f"pvlog_{esaf_number}.yaml"


def uploaded_pvlog_filename(esaf_number: str, original_filename: str) -> str:
    """Return the stored filename for an uploaded PVLogger source file."""
    return f"{esaf_number}_{Path(original_filename).name}"


def new_pvlog_filename(esaf_number: str, uploads_root: Path) -> str:
    """Return an unused filename for a newly created PVLogger source file."""
    base = f"{esaf_number}_new_pvlog.yaml"
    if not (uploads_root / base).exists():
        return base

    counter = 1
    while True:
        candidate = f"{esaf_number}_new_pvlog_{counter}.yaml"
        if not (uploads_root / candidate).exists():
            return candidate
        counter += 1
