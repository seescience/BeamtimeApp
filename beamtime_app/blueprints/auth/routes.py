#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/blueprints/auth/routes.py
# ----------------------------------------------------------------------------------
# Purpose:
# This file defines authentication routes using the service layer
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
# Copyright (C) 2025-2026 NSF SEES, USA
# ----------------------------------------------------------------------------------

import logging
from urllib.parse import urljoin, urlparse

from flask import Blueprint, current_app, flash, jsonify, redirect, render_template, request, session, url_for
from flask_login import current_user, login_required, login_user, logout_user
from pydantic import ValidationError

from beamtime_app.auth_schemas import UserInfo, create_error_response, create_success_response, validate_login_input
from beamtime_app.services import AuthService

# Configure logging
logger = logging.getLogger(__name__)

# Create authentication blueprint
auth = Blueprint("auth", __name__, url_prefix="/auth")


def is_safe_url(target):
    """Check if redirect URL is safe to prevent open redirect vulnerabilities."""
    ref_url = urlparse(request.host_url)
    test_url = urlparse(urljoin(request.host_url, target))
    return test_url.scheme in ("http", "https") and ref_url.netloc == test_url.netloc


@auth.route("/login", methods=["GET", "POST"])
def login() -> str | tuple:
    """Handle user login via LDAP authentication."""
    if not AuthService.is_ldap_configured():
        flash("Authentication not configured", "error")
        return redirect(url_for("main.home"))

    # Redirect if user is already authenticated
    if current_user.is_authenticated:
        return redirect(url_for("main.home"))

    if request.method == "POST":
        # Validate and sanitize input using Pydantic schemas
        try:
            if request.is_json:
                raw_data = request.get_json() or {}
            else:
                raw_data = {
                    "username": request.form.get("username", ""),
                    "password": request.form.get("password", ""),
                    "client_info": request.headers.get("User-Agent", "")[:500],
                }

            # Validate input with Pydantic
            login_data = validate_login_input(raw_data)
            username = login_data.username
            password = login_data.password

        except (ValidationError, ValueError) as e:
            error_msg = "Invalid input data provided"
            logger.warning(f"Login input validation failed: {str(e)}")

            if request.is_json:
                error_response = create_error_response(error_msg, "INVALID_INPUT")
                return jsonify(error_response.model_dump()), 400

            flash(error_msg, "error")
            return render_template("login.html")

        try:
            # Clear any existing session first
            if current_user.is_authenticated:
                logout_user()
                session.clear()

            # Authenticate user with LDAP via service
            success, user = AuthService.authenticate_user(username, password)

            if success and user:
                # Store user data in session immediately
                session["user_data"] = user.to_session_dict()

                # Log in user with Flask-Login
                login_user(user, remember=False)

                # Make session permanent if configured
                if current_app.config.get("SESSION_PERMANENT", True):
                    session.permanent = True

                # Force session to be saved immediately to prevent race conditions
                session.modified = True

                logger.info(f"Successful login for user: {username}")

                # Handle redirect after login
                next_page = request.args.get("next")
                if not next_page or not is_safe_url(next_page):
                    next_page = url_for("main.home")

                if request.is_json:
                    # Create secure response using Pydantic
                    user_info = UserInfo(
                        username=user.username, email=user.email, full_name=user.full_name, first_name=user.first_name, last_name=user.last_name
                    )

                    success_response = create_success_response(user_info=user_info, redirect_url=next_page, include_session_id=True)

                    return jsonify(success_response.model_dump())

                flash(f"Welcome back, {user.full_name}!", "success")
                return redirect(next_page)

            else:
                # Ensure we're fully logged out on failed authentication
                if current_user.is_authenticated:
                    logout_user()
                session.clear()

                # Clear any cached user data
                AuthService.clear_user_cache(username)

                error_msg = "Invalid username or password"
                logger.warning(f"Failed login attempt for user: {username}")

                if request.is_json:
                    error_response = create_error_response(error_msg, "AUTH_FAILED")
                    return jsonify(error_response.model_dump()), 401

                flash(error_msg, "error")

        except Exception as e:
            error_msg = "Authentication service temporarily unavailable"
            logger.error(f"Login error for {username if 'username' in locals() else 'unknown'}: {str(e)}")

            if request.is_json:
                error_response = create_error_response(error_msg, "SERVICE_ERROR")
                return jsonify(error_response.model_dump()), 500

            flash(error_msg, "error")

    return render_template("login.html", page_class="login-page")


@auth.route("/logout")
@login_required
def logout() -> str | tuple:
    """Handle user logout."""
    username = current_user.username
    user_id = current_user.get_id()

    # Clear user from cache
    AuthService.clear_user_cache(user_id)

    # Logout user with Flask-Login
    logout_user()

    # Clear session
    session.clear()

    logger.info(f"User logged out: {username}")
    flash("You have been logged out successfully", "info")

    return redirect(url_for("auth.login"))


@auth.route("/api/user_info")
@login_required
def api_user_info() -> tuple:
    """API endpoint to get current user information."""
    user_info = UserInfo(
        username=current_user.username,
        full_name=current_user.full_name,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
    )

    # Add additional fields not in the UserInfo schema
    response_data = user_info.model_dump()
    response_data.update(
        {
            "groups": current_user.groups[:10],
            "is_authenticated": current_user.is_authenticated,
        }
    )

    return jsonify(response_data)


# Error handlers for authentication blueprint
@auth.errorhandler(401)
def unauthorized(error) -> str | tuple:
    """Handle unauthorized access."""
    if request.is_json:
        return jsonify({"error": "Authentication required"}), 401
    flash("Please log in to access this page", "warning")
    return redirect(url_for("auth.login"))


@auth.errorhandler(403)
def forbidden(error) -> str | tuple:
    """Handle forbidden access."""
    if request.is_json:
        return jsonify({"error": "Access forbidden"}), 403
    flash("You do not have permission to access this resource", "error")
    return redirect(url_for("main.home"))
