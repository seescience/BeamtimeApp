# BeamtimeApp

BeamtimeApp is a web application for managing beamtime experiments at the NSF SEES beamlines of the Advanced Photon Source (APS). It handles experiment metadata, data path configuration, PVLogger setup, and DOI/acknowledgment assignment — all in one place before experiments are queued for processing.

The application is available at **[beamtime.seescience.org](https://beamtime.seescience.org/)**.

---

## What it does

1. **Browse experiments** — View all experiments for a given run, filtered by beamline, technique, or status.
2. **Edit experiment details** — Set the data path, attach a PVLogger YAML configuration, select acknowledgments, and choose DOI options.
3. **Queue for processing** — Send a configured experiment to the processing queue, which triggers folder creation, DOI minting, and data collection setup.

---

## Getting started

- [Logging in](login.md)
- [The dashboard](dashboard.md)
- [Viewing and editing experiments](experiments.md)
- [PVLogger configuration](pvlogger.md)
- [Adding an experiment to the queue](queue.md)
