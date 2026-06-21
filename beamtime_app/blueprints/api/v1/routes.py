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

from pathlib import Path

from flask import Blueprint, flash, jsonify, render_template, request, send_file, abort
from flask_login import login_required

from beamtime_app.crud import add_to_queue, get_all_entries, get_experiments, get_info_value
from beamtime_app.models import Acknowledgment, APSBeamline, Info, ProcessStatus, Run, Technique
from beamtime_app.pvlog_yaml import empty_pvlog_config, parse_pvlog_yaml, serialize_pvlog_yaml
from beamtime_app.utils import (
    format_info_modification_time,
    is_upload_original_pvlog_path,
    is_upload_pvlog_path,
    new_pvlog_filename,
    queue_pvlog_filename,
    resolve_pvlog_path,
    resolve_pvlog_reference,
    resolve_pvlog_write_path,
    uploaded_pvlog_filename,
)

# Create a Blueprint for the beamtime routes
api_v1 = Blueprint("api_v1", __name__, url_prefix="/api/v1")


@api_v1.route("/")
@login_required
def home() -> str:
    current_run_id = get_info_value("current_run_id")
    default_run = int(current_run_id) if current_run_id else None

    run_arg = request.args.get("run")
    selected_run = int(run_arg) if run_arg else (None if "run" in request.args else default_run)

    selected_beamline = request.args.get("beamline", type=int)
    selected_technique = request.args.get("technique", type=int)
    selected_status = request.args.get("status", type=int)

    experiments = get_experiments(run=selected_run, beamline=selected_beamline, technique=selected_technique, status=selected_status)

    return render_template(
        "index.html",
        beamlines=get_all_entries(APSBeamline),
        techniques=get_all_entries(Technique),
        runs=get_all_entries(Run),
        process_statuses=get_all_entries(ProcessStatus),
        experiments=experiments,
        acknowledgments=get_all_entries(Acknowledgment),
        last_modified=format_info_modification_time(get_all_entries(Info)),
        selected_run=selected_run,
        selected_beamline=selected_beamline,
        selected_technique=selected_technique,
        selected_status=selected_status,
    )


@api_v1.route("/create_update_queue", methods=["POST"])
@login_required
def create_update_queue() -> str:
    """Handles adding rows to the queue table."""
    # Get the rows from the request data
    rows = request.get_json().get("rows", [])

    # Filter out rows with only the DOI checkbox selected and map to correct column names
    valid_rows = [
        {
            "experiment_id": row.get("experiment_number") or None,
            "data_path": row.get("data_path") or "",
            "pvlog_path": row.get("pvlog_path") or "",
            "create_doi": row.get("doi") or False,
            "draft_doi": row.get("draft_doi") or False,
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
        flash(
            f"Added {result['success']} rows to the queue, but {result['failure']} rows failed.",
            "warning",
        )

    return jsonify(result)


@api_v1.route("/validate_data_path", methods=["POST"])
@login_required
def validate_data_path_api() -> str:
    """API endpoint to validate if a data path is valid."""
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


@api_v1.route("/get_pvlog_templates", methods=["GET"])
@login_required
def get_pvlog_templates() -> str:
    """API endpoint to fetch available PVLogger templates from the templates directory."""
    templates_dir = get_info_value("pvlog_templates_directory")

    templates_root = Path(templates_dir) if templates_dir else None

    if not templates_root or not templates_root.is_dir():
        return jsonify([])

    templates = []
    for beamline_dir in templates_root.iterdir():
        if not beamline_dir.is_dir():
            continue
        for entry in beamline_dir.iterdir():
            if entry.is_file() and entry.suffix.lower() in {".yaml", ".yml"}:
                label = f"{beamline_dir.name}-{entry.name}"
                templates.append({"label": label, "path": str(entry)})

    templates.sort(key=lambda t: t["label"])
    return jsonify(templates)


@api_v1.route("/serve_pdf", methods=["GET"])
@login_required
def serve_pdf() -> str:
    """Serves a PDF file from the server filesystem."""
    path = request.args.get("path", "")
    if not path:
        abort(400)

    pdf_path = Path("/") / path.lstrip("/")
    pdf_path = pdf_path.resolve()
    if not pdf_path.is_file():
        abort(404)

    return send_file(pdf_path, mimetype="application/pdf")


@api_v1.route("/upload_pvlogger_file", methods=["POST"])
@login_required
def upload_pvlogger_file() -> str:
    """API endpoint to upload and rename PVLogger YAML files."""
    # Check if file was uploaded
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # Get ESAF number from form data
    esaf_number = request.form.get("esaf_number")
    if not esaf_number:
        return jsonify({"error": "ESAF number is required"}), 400

    # Validate file extension
    filename = file.filename.lower()
    if not (filename.endswith(".yaml") or filename.endswith(".yml")):
        return jsonify({"error": "Only YAML files are allowed"}), 400

    try:
        # Get uploads directory from info table
        info_entries = get_all_entries(Info)
        uploads_dir = None
        for entry in info_entries:
            if entry.get("key") == "uploads_directory":
                uploads_dir = entry.get("value")
                break

        if not uploads_dir:
            return jsonify({"error": "Uploads directory not configured"}), 500

        uploads_root = Path(uploads_dir)
        uploads_root.mkdir(parents=True, exist_ok=True)

        original_filename = Path(file.filename).name
        stored_filename = uploaded_pvlog_filename(esaf_number, original_filename)
        file_path = uploads_root / stored_filename

        # Save the uploaded source file under its original name (ESAF-prefixed).
        file.save(file_path)

        return jsonify(
            {
                "success": True,
                "filename": stored_filename,
                "original_filename": original_filename,
                "path": str(file_path),
                "message": f"Uploaded {original_filename} as {stored_filename}",
            }
        )

    except Exception as e:
        return jsonify({"error": f"Error uploading file: {str(e)}"}), 500


@api_v1.route("/create_pvlog_file", methods=["POST"])
@login_required
def create_pvlog_file() -> str:
    """Create a new empty PVLogger YAML file in the uploads directory."""
    data = request.get_json() or {}
    esaf_number = data.get("esaf_number")
    if not esaf_number:
        return jsonify({"error": "ESAF number is required"}), 400

    uploads_dir = get_info_value("uploads_directory")
    if not uploads_dir:
        return jsonify({"error": "Uploads directory not configured"}), 500

    try:
        uploads_root = Path(uploads_dir)
        uploads_root.mkdir(parents=True, exist_ok=True)

        stored_filename = new_pvlog_filename(esaf_number, uploads_root)
        file_path = uploads_root / stored_filename
        file_path.write_text(serialize_pvlog_yaml(empty_pvlog_config()), encoding="utf-8")

        return jsonify(
            {
                "success": True,
                "filename": stored_filename,
                "original_filename": stored_filename,
                "path": str(file_path),
                "message": f"Created {stored_filename}",
            }
        )
    except OSError as exc:
        return jsonify({"error": f"Unable to create file: {exc}"}), 500


@api_v1.route("/read_pvlog_file", methods=["GET"])
@login_required
def read_pvlog_file() -> str:
    """Read a PVLogger YAML file from an allowed directory."""
    path = request.args.get("path", "")
    resolved = resolve_pvlog_reference(path)
    if not resolved:
        return jsonify({"error": "PVLogger file not found or not accessible"}), 404

    try:
        content = Path(resolved).read_text(encoding="utf-8")
    except OSError as exc:
        return jsonify({"error": f"Unable to read file: {exc}"}), 500

    return jsonify(
        {
            "success": True,
            "path": resolved,
            "content": content,
            "parsed": parse_pvlog_yaml(content),
            "can_update_original": not is_upload_pvlog_path(resolved),
            "can_overwrite_original": (
                not is_upload_pvlog_path(resolved) or is_upload_original_pvlog_path(resolved)
            ),
            "source_kind": (
                "template"
                if not is_upload_pvlog_path(resolved)
                else "upload"
                if is_upload_original_pvlog_path(resolved)
                else "queue_copy"
            ),
        }
    )


@api_v1.route("/save_pvlog_file", methods=["POST"])
@login_required
def save_pvlog_file() -> str:
    """Save edited PVLogger YAML as a queue copy or overwrite the original source file."""
    data = request.get_json() or {}
    source_path = data.get("source_path", "")
    original_path = data.get("original_path", "")
    content = data.get("content")
    parsed = data.get("parsed")
    esaf_number = data.get("esaf_number")
    action = data.get("action", "copy_to_uploads")

    if content is None and parsed is None:
        return jsonify({"error": "PVLogger content is required"}), 400

    if content is None:
        content = serialize_pvlog_yaml(parsed)

    try:
        if action == "overwrite_original":
            target_path = original_path or source_path
            resolved_original = resolve_pvlog_write_path(target_path)
            if not resolved_original:
                return jsonify({"error": "Original PVLogger file not found or not accessible"}), 404

            original_file = Path(resolved_original)
            original_file.write_text(content, encoding="utf-8")
            return jsonify(
                {
                    "success": True,
                    "path": str(original_file),
                    "filename": original_file.name,
                    "message": f"Overwrote {original_file}",
                }
            )

        if not esaf_number:
            return jsonify({"error": "ESAF number is required"}), 400

        uploads_dir = get_info_value("uploads_directory")
        if not uploads_dir:
            return jsonify({"error": "Uploads directory not configured"}), 500

        uploads_root = Path(uploads_dir)
        uploads_root.mkdir(parents=True, exist_ok=True)
        working_path = uploads_root / queue_pvlog_filename(esaf_number)
        working_path.write_text(content, encoding="utf-8")

        return jsonify(
            {
                "success": True,
                "path": str(working_path),
                "filename": working_path.name,
                "message": f"Saved PVLogger copy to {working_path.name}",
            }
        )
    except OSError as exc:
        return jsonify({"error": f"Unable to save file: {exc}"}), 500
