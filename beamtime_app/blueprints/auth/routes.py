#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/blueprints/auth/routes.py
# ----------------------------------------------------------------------------------
# Purpose:
# Authentication routes.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

import logging
from urllib.parse import urljoin, urlparse

from flask import Blueprint, current_app, flash, redirect, render_template, request, session, url_for
from flask_login import current_user, login_required, login_user, logout_user
from pydantic import ValidationError

from beamtime_app.auth_schemas import validate_login_input
from beamtime_app.services import AuthService, User

logger = logging.getLogger(__name__)

auth = Blueprint("auth", __name__, url_prefix="/auth")


def is_safe_url(target):
    ref_url = urlparse(request.host_url)
    test_url = urlparse(urljoin(request.host_url, target))
    return test_url.scheme in ("http", "https") and ref_url.netloc == test_url.netloc


def _dev_auth_user(username: str) -> User:
    display_name = username.replace("_", " ").replace(".", " ").title()
    return User(
        username=username,
        first_name=display_name.split()[0] if display_name else "Dev",
        last_name=display_name.split()[-1] if display_name and " " in display_name else "",
        display_name=display_name or username,
        dn=f"uid={username},ou=dev,dc=local",
        groups=["CN=BeamtimeApp Dev,OU=Groups,DC=local"],
    )


def _complete_login(user: User) -> str:
    session["user_data"] = user.to_session_dict()
    login_user(user, remember=False)

    if current_app.config.get("SESSION_PERMANENT", True):
        session.permanent = True
    session.modified = True

    next_page = request.args.get("next")
    if not next_page or not is_safe_url(next_page):
        next_page = url_for("main.home")

    flash(f"Welcome back, {user.full_name}!", "success")
    return redirect(next_page)


@auth.route("/login", methods=["GET", "POST"])
def login() -> str:
    dev_auth_bypass = current_app.config.get("DEV_AUTH_BYPASS", False)

    if not AuthService.is_ldap_configured() and not dev_auth_bypass:
        flash("Authentication not configured", "error")
        return redirect(url_for("main.home"))

    if current_user.is_authenticated:
        return redirect(url_for("main.home"))

    if request.method == "POST":
        try:
            login_data = validate_login_input(
                {
                    "username": request.form.get("username", ""),
                    "password": request.form.get("password", ""),
                }
            )
            username = login_data.username
            password = login_data.password
        except (ValidationError, ValueError) as e:
            logger.warning(f"Login input validation failed: {str(e)}")
            flash("Invalid input data provided", "error")
            return render_template("login.html", dev_auth_bypass=dev_auth_bypass)

        try:
            if current_user.is_authenticated:
                logout_user()
                session.clear()

            if dev_auth_bypass and not AuthService.is_ldap_configured():
                logger.info(f"Dev auth bypass login for user: {username}")
                return _complete_login(_dev_auth_user(username))

            success, user = AuthService.authenticate_user(username, password)
            if success and user:
                logger.info(f"Successful login for user: {username}")
                return _complete_login(user)

            if current_user.is_authenticated:
                logout_user()
            session.clear()
            AuthService.clear_user_cache(username)
            logger.warning(f"Failed login attempt for user: {username}")
            flash("Invalid username or password", "error")

        except Exception as e:
            logger.error(f"Login error for {username if 'username' in locals() else 'unknown'}: {str(e)}")
            flash("Authentication service temporarily unavailable", "error")

    return render_template("login.html", page_class="login-page", dev_auth_bypass=dev_auth_bypass)


@auth.route("/logout")
@login_required
def logout() -> str:
    username = current_user.username
    AuthService.clear_user_cache(current_user.get_id())
    logout_user()
    session.clear()
    logger.info(f"User logged out: {username}")
    flash("You have been logged out successfully", "info")
    return redirect(url_for("auth.login"))
