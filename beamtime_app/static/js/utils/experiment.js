/* ----------------------------------------------------------------------------------
 * Project: BeamtimeApp
 * File: beamtime_app/static/src/utils/experiment.ts
 * ----------------------------------------------------------------------------------
 * Purpose:
 * This file provides utility functions for working with experiment data,
 * including data extraction, formatting, and template value generation.
 * ----------------------------------------------------------------------------------
 * Author: Christofanis Skordas
 *
 * Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
 * Copyright (C) 2025-2026 NSF SEES, USA
 * ---------------------------------------------------------------------------------- */
import { DEFAULT_USER_LASTNAME, NA_VALUE } from './constants.js';
import { safeJsonParse, isValidValue, escapeHtml } from './dom.js';
/**
 * Extracts the last name from a full name string
 */
export function extractLastName(fullName) {
    if (!fullName || fullName === NA_VALUE) {
        return DEFAULT_USER_LASTNAME;
    }
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length > 1) {
        return nameParts[nameParts.length - 1].toLowerCase();
    }
    return DEFAULT_USER_LASTNAME;
}
/**
 * Extracts year from a date string
 */
export function extractYear(dateString) {
    if (!dateString) {
        return new Date().getFullYear();
    }
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date.getFullYear();
    }
    return new Date().getFullYear();
}
/**
 * Gets experiment data from a table row
 */
export function getExperimentDataFromRow(experimentId) {
    if (!experimentId)
        return null;
    const row = document.querySelector(`tr[data-experiment-id="${experimentId}"]`);
    if (!row)
        return null;
    const experimentDataStr = row.getAttribute('data-experiment-data');
    if (!experimentDataStr)
        return null;
    return safeJsonParse(experimentDataStr, null);
}
/**
 * Gets template values (year, runNumber, userLastName) from experiment
 */
export function getTemplateValues(experimentId) {
    const defaults = {
        year: new Date().getFullYear(),
        runNumber: '',
        userLastName: DEFAULT_USER_LASTNAME
    };
    if (!experimentId)
        return defaults;
    const experiment = getExperimentDataFromRow(experimentId);
    if (!experiment)
        return defaults;
    // Handle run_id as either string or number
    let runNumber = '';
    if (experiment.run_id !== undefined && experiment.run_id !== null) {
        runNumber = String(experiment.run_id);
    }
    return {
        year: extractYear(experiment.start_date),
        runNumber: runNumber,
        userLastName: extractLastName(experiment.spokesperson_name)
    };
}
/**
 * Formats a date string to a localized date
 */
export function formatDate(dateString) {
    if (!isValidValue(dateString))
        return NA_VALUE;
    const date = new Date(dateString);
    if (isNaN(date.getTime()))
        return NA_VALUE;
    return date.toLocaleDateString();
}
/**
 * Creates a person display with optional email link
 */
export function formatPersonWithEmail(name, email) {
    if (!isValidValue(name))
        return NA_VALUE;
    if (isValidValue(email)) {
        return `${escapeHtml(name)} <br><small><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></small>`;
    }
    return escapeHtml(name);
}
//# sourceMappingURL=experiment.js.map