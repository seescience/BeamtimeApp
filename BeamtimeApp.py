#!/usr/bin/env python3
# ----------------------------------------------------------------------------------
# Project: BeamtimeApp
# File: beamtime_app.py
# ----------------------------------------------------------------------------------
# Purpose:
# This is the main entry point for the Beamtime application. This file is used to
# create the Flask app and run the gunicorn server.
# ----------------------------------------------------------------------------------
# Author: Christofanis Skordas
#
# Copyright (C) 2025 GSECARS, The University of Chicago, USA
# Copyright (C) 2025 NSF SEES, USA
# ----------------------------------------------------------------------------------

import argparse
import subprocess

from beamtime_app import create_flask_app


app = create_flask_app()


def main() -> None:
    """Main entry point for the beamtime application."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Beamtime App")
    parser.add_argument("-d", "--debug", action="store_true", help="Enable debug")
    parser.add_argument("-p", "--port", type=int, help="Port to run the server on. Default port is 5000.")
    args = parser.parse_args()

    # Run the Flask app
    if args.debug:
        app.run(host="0.0.0.0", port=args.port if args.port else 5000, debug=True)
    else:
        subprocess.run(["gunicorn", "-c", "beamtimeapp/gunicorn_config.py", "BeamtimeApp:app"])


if __name__ == "__main__":
    main()
