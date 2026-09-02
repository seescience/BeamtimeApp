#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/pvlog_yaml.py
# ----------------------------------------------------------------------------------
# Purpose:
# Parse and serialize PVLogger YAML configuration files used by the app editor.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

from typing import Any


def empty_pvlog_config() -> dict[str, Any]:
    """Return an empty PVLogger configuration structure."""
    return {
        "start_datetime": "",
        "end_datetime": "",
        "escan_credentials": "",
        "instruments": [],
        "pvs": [],
    }


def parse_pv_entry(line: str) -> dict[str, str]:
    """Parse a pipe-delimited PV list entry."""
    parts = [part.strip() for part in line.split("|")]
    return {
        "name": parts[0] if parts else "",
        "description": parts[1] if len(parts) > 1 else "",
        "interval": parts[2] if len(parts) > 2 else "",
    }


def format_pv_entry(entry: dict[str, Any]) -> str:
    """Serialize a PV entry to the pipe-delimited list format."""
    name = str(entry.get("name", "")).strip()
    description = str(entry.get("description", "")).strip()
    interval = str(entry.get("interval", "")).strip()

    if description and interval:
        return f"{name} | {description} | {interval}"
    if description:
        return f"{name} | {description}"
    return name


def parse_pvlog_yaml(content: str) -> dict[str, Any]:
    """Parse a PVLogger YAML file into a structured dictionary."""
    config = empty_pvlog_config()
    section: str | None = None

    for raw_line in content.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if stripped.startswith("start_datetime:"):
            config["start_datetime"] = stripped.split(":", 1)[1].strip()
            section = None
            continue
        if stripped.startswith("end_datetime:"):
            config["end_datetime"] = stripped.split(":", 1)[1].strip()
            section = None
            continue
        if stripped.startswith("escan_credentials:"):
            config["escan_credentials"] = stripped.split(":", 1)[1].strip()
            section = None
            continue
        if stripped == "instruments:":
            section = "instruments"
            continue
        if stripped == "pvs:":
            section = "pvs"
            continue

        if stripped.startswith("- ") and section == "instruments":
            config["instruments"].append(stripped[2:].strip())
            continue
        if stripped.startswith("- ") and section == "pvs":
            config["pvs"].append(parse_pv_entry(stripped[2:]))
            continue

        if section == "instruments":
            config["instruments"].append(stripped)
        elif section == "pvs":
            config["pvs"].append(parse_pv_entry(stripped))

    return config


def serialize_pvlog_yaml(config: dict[str, Any]) -> str:
    """Serialize a structured PVLogger configuration to YAML text."""
    data = empty_pvlog_config()
    data.update(config or {})

    lines = [
        f"start_datetime: {str(data['start_datetime']).strip()}",
        f"end_datetime: {str(data['end_datetime']).strip()}",
        f"escan_credentials: {str(data['escan_credentials']).strip()}",
        "instruments:",
    ]

    instruments = data.get("instruments") or []
    if instruments:
        lines.extend(f"  - {str(item).strip()}" for item in instruments if str(item).strip())

    lines.append("pvs:")
    pvs = data.get("pvs") or []
    if pvs:
        for entry in pvs:
            formatted = format_pv_entry(entry)
            if formatted:
                lines.append(f"  - {formatted}")

    return "\n".join(lines) + "\n"
