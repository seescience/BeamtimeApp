#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/services/nextcloud_service.py
# ----------------------------------------------------------------------------------
# Purpose:
# This file contains the Nextcloud OCC service for creating local storage mounts.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

import logging
from contextlib import contextmanager

from flask import current_app
from gselib.cloud import NextcloudOCC

logger = logging.getLogger(__name__)

__all__ = ["is_nextcloud_configured", "create_nextcloud_mount", "list_nextcloud_mounts"]


def is_nextcloud_configured() -> bool:
    """Check if Nextcloud OCC is properly configured."""
    try:
        return bool(current_app.config.get("NEXTCLOUD_OCC_CMD"))
    except Exception:
        return False


@contextmanager
def _occ():
    cfg = current_app.config
    occ_cmd = cfg["NEXTCLOUD_OCC_CMD"]
    host = cfg.get("NEXTCLOUD_SSH_HOST")
    if host:
        occ = NextcloudOCC(
            host=host,
            user=cfg.get("NEXTCLOUD_SSH_USER"),
            key_path=cfg.get("NEXTCLOUD_SSH_KEY"),
            password=cfg.get("NEXTCLOUD_SSH_PASSWORD"),
            port=cfg.get("NEXTCLOUD_SSH_PORT", 22),
            occ_cmd=occ_cmd,
        )
    else:
        occ = NextcloudOCC(occ_cmd=occ_cmd)
    try:
        yield occ
    finally:
        occ.close()


def create_nextcloud_mount(mount_point: str, server_path: str, users: list[str]) -> dict:
    """Create a local external storage mount in Nextcloud for the given users."""
    with _occ() as occ:
        result = occ.create_local_storage(
            mount_point,
            server_path,
            applicable_users=users if users else None,
        )
    logger.info(f"Nextcloud: created mount '{mount_point}' (id={result.get('id')}) -> '{server_path}' for {len(users)} user(s)")
    return result


def list_nextcloud_mounts() -> list:
    """List all Nextcloud external storage mounts."""
    with _occ() as occ:
        return occ.list_storages()
