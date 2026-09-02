#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app/services/auth_service.py
# ----------------------------------------------------------------------------------
# Purpose:
# This file contains the complete authentication service with LDAP implementation
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

import logging
import ssl
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from flask import current_app, session
from flask_login import UserMixin
from ldap3 import ALL, Connection, Server, Tls

# Configure logging
logger = logging.getLogger(__name__)


# Global LDAP auth instance
_ldap_auth: Optional["LDAPAuth"] = None


@dataclass
class User(UserMixin):
    """User class for Flask-Login integration with LDAP attributes."""

    username: str
    first_name: str
    last_name: str
    display_name: str
    dn: str
    groups: List[str] = field(default_factory=list)
    is_authenticated: bool = True
    is_active: bool = True
    is_anonymous: bool = False

    def get_id(self) -> str:
        """Return the username as the user identifier."""
        return self.username

    @property
    def full_name(self) -> str:
        """Return the user's full name."""
        return f"{self.first_name} {self.last_name}".strip()

    def __repr__(self) -> str:
        return f"<User {self.username} ({self.full_name})>"

    def to_session_dict(self) -> dict:
        """Convert user to session-safe dictionary."""
        return {
            "username": self.username,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "display_name": self.display_name,
            "dn": self.dn,
            "groups": self.groups[:10],
            "is_authenticated": self.is_authenticated,
            "is_active": self.is_active,
            "is_anonymous": self.is_anonymous,
        }

    @classmethod
    def from_session_dict(cls, data: dict) -> "User":
        """Create user from session dictionary."""
        return cls(
            username=data["username"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            display_name=data["display_name"],
            dn=data["dn"],
            groups=data.get("groups", []),
            is_authenticated=data.get("is_authenticated", True),
            is_active=data.get("is_active", True),
            is_anonymous=data.get("is_anonymous", False),
        )


class LDAPAuth:
    """LDAP authentication class with support for Active Directory."""

    def __init__(self):
        """Initialize LDAP authentication with configuration."""
        self._server = None
        self._setup_server()

    def _setup_server(self) -> None:
        """Setup LDAP server connection with SSL/TLS support."""
        try:
            # Configure TLS if required
            tls_config = None
            if current_app.config["LDAP_USE_SSL"] or current_app.config["LDAP_USE_TLS"]:
                tls_config = Tls(
                    validate=ssl.CERT_REQUIRED, version=ssl.PROTOCOL_TLSv1_2, ciphers="HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA"
                )

            # Create server instance
            self._server = Server(
                host=current_app.config["LDAP_HOST"],
                port=current_app.config["LDAP_PORT"],
                use_ssl=current_app.config["LDAP_USE_SSL"],
                tls=tls_config,
                get_info=ALL,
                connect_timeout=30,
            )

            logger.info(f"LDAP server configured: {current_app.config['LDAP_HOST']}:{current_app.config['LDAP_PORT']}")

        except Exception as e:
            logger.error(f"Failed to setup LDAP server: {e}")
            raise

    def _create_connection(self, user_dn: Optional[str] = None, password: Optional[str] = None) -> Connection:
        """Create LDAP connection with optional user credentials."""
        try:
            # Use service account credentials if no user credentials provided
            bind_dn = user_dn or current_app.config["LDAP_BIND_DN"]
            bind_password = password or current_app.config["LDAP_BIND_PASSWORD"]

            connection = Connection(
                server=self._server, user=bind_dn, password=bind_password, auto_bind=True, auto_referrals=True, read_only=True, raise_exceptions=True
            )

            # Start TLS if configured
            if current_app.config["LDAP_USE_TLS"] and not current_app.config["LDAP_USE_SSL"]:
                connection.start_tls()

            return connection
        except Exception as e:
            logger.error(f"Unexpected error creating LDAP connection: {e}")
            raise

    def _search_user(self, connection: Connection, username: str) -> Optional[Dict]:
        """Search for user by username in LDAP."""
        try:
            search_filter = f"(&(objectClass=user)({current_app.config['LDAP_USER_LOGIN_ATTR']}={username}))"

            success = connection.search(
                search_base=current_app.config["LDAP_USER_DN"],
                search_filter=search_filter,
                search_scope="SUBTREE",
                attributes=[current_app.config["LDAP_USER_FIRST_NAME_ATTR"], current_app.config["LDAP_USER_LAST_NAME_ATTR"], "memberOf"],
                time_limit=30,
            )

            if success and connection.entries:
                entry = connection.entries[0]
                return {"dn": entry.entry_dn, "attributes": entry.entry_attributes_as_dict}

            logger.warning(f"User not found in LDAP: {username}")
            return None

        except Exception as e:
            logger.error(f"Unexpected error searching for user {username}: {e}")
            raise

    def _check_group_membership(self, user_groups: List[str]) -> bool:
        """Check if user is member of authorized groups."""
        if not current_app.config["LDAP_REQUIRE_GROUP"] or not current_app.config["LDAP_AUTHORIZED_GROUPS"]:
            return True

        authorized_groups = [group.strip() for group in current_app.config["LDAP_AUTHORIZED_GROUPS"].split(";")]

        # Check if user is member of any authorized group
        for user_group in user_groups:
            if any(auth_group.lower() in user_group.lower() for auth_group in authorized_groups):
                logger.info(f"User authorized via group: {user_group}")
                return True

        logger.warning(f"User not member of authorized groups. User groups: {user_groups}")
        return False

    def authenticate_user(self, username: str, password: str) -> Tuple[bool, Optional[User]]:
        """Authenticate user against LDAP and return User object if successful."""
        if not username or not password:
            logger.warning("Empty username or password provided")
            return False, None

        connection = None
        try:
            # First, bind with service account to search for user
            connection = self._create_connection()

            # Search for user
            user_data = self._search_user(connection, username)
            if not user_data:
                return False, None

            user_dn = user_data["dn"]
            attributes = user_data["attributes"]

            # Close service account connection
            connection.unbind()

            # Now try to bind with user credentials to verify password
            try:
                user_connection = self._create_connection(user_dn, password)
                user_connection.unbind()
            except Exception:
                logger.warning(f"Authentication failed for user: {username}")
                return False, None

            # Extract user information (handle missing attributes gracefully)
            first_name = (
                attributes.get(current_app.config["LDAP_USER_FIRST_NAME_ATTR"], [""])[0]
                if attributes.get(current_app.config["LDAP_USER_FIRST_NAME_ATTR"])
                else ""
            )
            last_name = (
                attributes.get(current_app.config["LDAP_USER_LAST_NAME_ATTR"], [""])[0]
                if attributes.get(current_app.config["LDAP_USER_LAST_NAME_ATTR"])
                else ""
            )
            user_groups = attributes.get("memberOf", [])

            # Check group membership if required
            if not self._check_group_membership(user_groups):
                logger.warning(f"User {username} not authorized - insufficient group membership")
                return False, None

            # Create User object
            user = User(
                username=username, first_name=first_name, last_name=last_name, display_name=f"{first_name} {last_name}".strip(), dn=user_dn, groups=user_groups
            )

            logger.info(f"Successfully authenticated user: {username} ({first_name} {last_name})")
            return True, user

        except Exception as e:
            logger.error(f"Unexpected authentication error for {username}: {e}")
            return False, None
        finally:
            if connection:
                try:
                    connection.unbind()
                except Exception as e:
                    logger.warning(f"Error closing LDAP connection during cleanup: {e}")


class AuthService:
    """Authentication service providing business logic for user authentication."""

    @staticmethod
    def get_ldap_auth() -> Optional[LDAPAuth]:
        """Get the LDAP authentication instance."""
        global _ldap_auth

        if _ldap_auth is None and AuthService.is_ldap_configured():
            try:
                _ldap_auth = LDAPAuth()
                logger.info("LDAP authentication initialized")
            except Exception as e:
                logger.error(f"Failed to initialize LDAP authentication: {e}")

        return _ldap_auth

    @staticmethod
    def is_ldap_configured() -> bool:
        """Check if LDAP is properly configured."""
        try:
            required_fields = ["LDAP_HOST", "LDAP_BIND_DN", "LDAP_USER_DN"]
            return all(current_app.config.get(field) for field in required_fields)
        except Exception:
            return False

    @staticmethod
    def authenticate_user(username: str, password: str) -> Tuple[bool, Optional[User]]:
        """Authenticate user against LDAP"""
        ldap_auth = AuthService.get_ldap_auth()

        if not ldap_auth:
            logger.error("Authentication attempted but LDAP is not configured")
            return False, None

        try:
            success, user = ldap_auth.authenticate_user(username, password)

            if success and user:
                # Cache the user in session
                cache_user(user)
                logger.info(f"User authenticated successfully: {username}")
            else:
                logger.warning(f"Authentication failed for user: {username}")

            return success, user

        except Exception as e:
            logger.error(f"Authentication error for user {username}: {e}")
            return False, None

    @staticmethod
    def clear_user_cache(user_id: str) -> None:
        clear_user_cache(user_id)


def get_user_by_id(user_id: str) -> Optional[User]:
    """User loader function for Flask-Login - uses Flask session."""
    # Check if user data is in session
    user_data = session.get("user_data")
    if user_data and user_data.get("username") == user_id:
        try:
            return User.from_session_dict(user_data)
        except Exception as e:
            logger.warning(f"Failed to load user from session: {e}")
            # Clear corrupted session data
            session.pop("user_data", None)

    return None


def cache_user(user: User) -> None:
    """Store user in Flask session."""
    session["user_data"] = user.to_session_dict()
    session.permanent = True


def clear_user_cache(user_id: str) -> None:
    """Remove user from Flask session."""
    session.pop("user_data", None)
