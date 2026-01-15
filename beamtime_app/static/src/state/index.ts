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

import type { BootstrapModal, AcknowledgmentOption, SortState } from '../types/index.js';

// Global state
export let acknowledgmentOptions: AcknowledgmentOption[] = [];
export let currentSortState: SortState[] = [];
export let experimentModal: BootstrapModal | null = null;
export let experimentViewModal: BootstrapModal | null = null;
export let currentEditingExperiment: string | null = null;

/**
 * Sets acknowledgment options
 */
export function setAcknowledgmentOptions(options: AcknowledgmentOption[]): void {
    acknowledgmentOptions = options;
}

/**
 * Sets current editing experiment
 */
export function setCurrentEditingExperiment(experimentId: string | null): void {
    currentEditingExperiment = experimentId;
}

/**
 * Sets experiment modal
 */
export function setExperimentModal(modal: BootstrapModal | null): void {
    experimentModal = modal;
}

/**
 * Sets experiment view modal
 */
export function setExperimentViewModal(modal: BootstrapModal | null): void {
    experimentViewModal = modal;
}
