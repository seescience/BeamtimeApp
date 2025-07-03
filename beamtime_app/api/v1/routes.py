#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/api/v1/routes.py
# ----------------------------------------------------------------------------------
# Purpose:
# This file is used to define the routes the v1 API.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

from flask import Blueprint, flash, jsonify, render_template, request

from beamtime_app.crud import (
    add_to_queue,
    get_all_entries,
    get_data_path,
    get_experiments,
)
from beamtime_app.models import Acknowledgment, Beamline, Info, Run, Station, Technique
from beamtime_app.utils import format_info_modification_time

# Create a Blueprint for the beamtime routes
api_v1 = Blueprint("api_v1", __name__, url_prefix="/api/v1")


@api_v1.route("/")
def home():
    selected_run = request.args.get("run", type=int)
    selected_beamline = request.args.get("beamline", type=int)
    selected_station = request.args.get("station", type=int)
    selected_technique = request.args.get("technique", type=int)
    experiments = get_experiments(run=selected_run, beamline=selected_beamline)
    return render_template(
        "index.html",
        beamlines=get_all_entries(Beamline),
        stations=get_all_entries(Station),
        techniques=get_all_entries(Technique),
        runs=get_all_entries(Run),
        experiments=experiments,
        acknowledgments=get_all_entries(Acknowledgment),
        last_modified=format_info_modification_time(get_all_entries(Info)),
        selected_run=selected_run,
        selected_beamline=selected_beamline,
        selected_station=selected_station,
        selected_technique=selected_technique,
    )


@api_v1.route("/get_acknowledgments", methods=["GET"])
def get_acknowledgments() -> str:
    """API endpoint to fetch acknowledgment options."""
    acknowledgments = get_all_entries(Acknowledgment)
    return jsonify(acknowledgments)


@api_v1.route("/get_data_path", methods=["GET"])
def get_data_path_api():
    """API endpoint to fetch data path template."""
    station_id = request.args.get("station_id", type=int)
    technique_id = request.args.get("technique_id", type=int)

    if not station_id or not technique_id:
        return "", 400

    template = get_data_path(station_id, technique_id)
    return template


@api_v1.route("/create_update_queue", methods=["POST"])
def create_update_queue() -> str:
    """Handles adding rows to the queue table."""
    # Get the rows from the request data
    rows = request.get_json().get("rows", [])

    # Filter out rows with only the DOI checkbox selected
    valid_rows = [
        {
            "experiment_number": row.get("experiment_number") or None,
            "title": row.get("title") or None,
            "data_path": row.get("data_path") or None,
            "pvlog_path": row.get("pvlog_path") or None,
            "doi": row.get("doi") or None,
            "proposal_number": row.get("proposal_number") or None,
            "acknowledgments": row.get("acknowledgments") or [],
        }
        for row in rows
        # Ensure that at least one of the fields is not None or empty, except DOI
        if any(
            value not in [None, "N/A", False, ""]
            for key, value in row.items()
            if key != "doi"
        )
    ]

    # Add the valid rows to the queue
    result = add_to_queue(rows=valid_rows)

    # Check the result and flash appropriate messages
    if result["failure"] == 0:
        flash(f"Successfully added {result['success']} rows to the queue.", "success")
    else:
        flash(
            f"Added {result['success']} rows to the queue, but {result['failure']} rows failed.",
            "warning",
        )

    return jsonify(result)


@api_v1.route("/validate_data_path", methods=["POST"])
def validate_data_path_api():
    """API endpoint to validate if a data path is valid."""
    from flask import jsonify, request

    from beamtime_app.utils import validate_and_normalize_datapath

    data = request.get_json()
    if not data or "path" not in data:
        return jsonify({"error": "Path is required"}), 400

    path = data["path"]
    if not path or not path.strip():
        return jsonify({"exists": False, "valid": False, "message": "Empty path"})

    try:
        result = validate_and_normalize_datapath(path)
        return jsonify(
            {
                "exists": result["exists"],
                "valid": result["valid"],
                "message": result["message"],
                "normalized": result["normalized"],
            }
        )
    except Exception as e:
        return jsonify({"error": f"Error validating path: {str(e)}"}), 500
