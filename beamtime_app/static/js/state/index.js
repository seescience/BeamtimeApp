/* ----------------------------------------------------------------------------------
 * Project: BeamtimeApp
 * File: beamtime_app/static/src/state/index.ts
 * ----------------------------------------------------------------------------------
 * Purpose:
 * This file manages global application state including modals, experiments,
 * and acknowledgment options.
 * ----------------------------------------------------------------------------------
 * Author: Christofanis Skordas
 *
 * Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
 * Copyright (C) 2025-2026 NSF SEES, USA
 * ---------------------------------------------------------------------------------- */
// Global state
export let acknowledgmentOptions = [];
export let currentSortState = [];
export let experimentModal = null;
export let experimentViewModal = null;
export let currentEditingExperiment = null;
/**
 * Sets acknowledgment options
 */
export function setAcknowledgmentOptions(options) {
    acknowledgmentOptions = options;
}
/**
 * Sets current editing experiment
 */
export function setCurrentEditingExperiment(experimentId) {
    currentEditingExperiment = experimentId;
}
/**
 * Sets experiment modal
 */
export function setExperimentModal(modal) {
    experimentModal = modal;
}
/**
 * Sets experiment view modal
 */
export function setExperimentViewModal(modal) {
    experimentViewModal = modal;
}
//# sourceMappingURL=index.js.map