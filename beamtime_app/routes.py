#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/routes.py
# ----------------------------------------------------------------------------------
# Purpose:
# This file is used to define the routes for the BeamtimeApp.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

from flask import Blueprint, render_template, request, jsonify, flash

from beamtime_app.crud import get_all_entries, add_to_queue
from beamtime_app.models import Beamline, Experiment, Acknowledgment, Run, Station, Technique, Info
from beamtime_app.utils import format_experiment_data, format_info_modification_time

# Create a Blueprint for the beamtime routes
beamtime = Blueprint("beamtime", __name__)


@beamtime.route("/")
def home_route():
    return render_template(
        "index.html",
        beamlines=get_all_entries(Beamline),
        stations=get_all_entries(Station),
        techniques=get_all_entries(Technique),
        runs=get_all_entries(Run),
        experiments=format_experiment_data(get_all_entries(Experiment)),
        acknowledgments=get_all_entries(Acknowledgment),
        last_modified=format_info_modification_time(get_all_entries(Info)),
    )


@beamtime.route("/filter_experiments", methods=["POST"])
def filter_experiments() -> str:
    """Filters experiments based on the selected beamline and run. It handles POST requests and expects a JSON payload with 'beamline' and 'run' keys."""

    # Get the selected beamline and run from the request data
    data = request.get_json()
    selected_beamline = data.get("beamline")
    selected_run = data.get("run")

    # Get all available experiments
    experiments = format_experiment_data(get_all_entries(Experiment))

    # Filter experiments based on the selected beamline and run
    if selected_beamline:
        experiments = [exp for exp in experiments if exp["beamline_id"] == int(selected_beamline)]
    if selected_run and selected_run != "":
        experiments = [exp for exp in experiments if exp["run_id"] == int(selected_run)]

    return jsonify(experiments)


@beamtime.route("/get_acknowledgments", methods=["GET"])
def get_acknowledgments() -> str:
    """API endpoint to fetch acknowledgment options."""

    acknowledgments = get_all_entries(Acknowledgment)
    return jsonify(acknowledgments)


@beamtime.route("/create_update_queue", methods=["POST"])
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
        if any(value not in [None, "N/A", False, ""] for key, value in row.items() if key != "doi")
    ]

    # Add the valid rows to the queue
    result = add_to_queue(rows=valid_rows)

    # Check the result and flash appropriate messages
    if result["failure"] == 0:
        flash(f"Successfully added {result['success']} rows to the queue.", "success")
    else:
        flash(f"Added {result['success']} rows to the queue, but {result['failure']} rows failed.", "warning")

    return jsonify(result)
