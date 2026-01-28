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

import type { Experiment, TemplateValues } from '../types/index.js';
import { DEFAULT_USER_LASTNAME, NA_VALUE } from './constants.js';
import { safeJsonParse, isValidValue, escapeHtml } from './dom.js';

/**
 * Extracts the last name from a full name string
 */
export function extractLastName(fullName: string | undefined | null): string {
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
export function extractYear(dateString: string | undefined | null): number {
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
export function getExperimentDataFromRow(experimentId: string | null): Experiment | null {
    if (!experimentId) return null;
    
    const row = document.querySelector<HTMLTableRowElement>(`tr[data-experiment-id="${experimentId}"]`);
    if (!row) return null;
    
    const experimentDataStr = row.getAttribute('data-experiment-data');
    if (!experimentDataStr) return null;
    
    return safeJsonParse<Experiment>(experimentDataStr, null);
}

/**
 * Gets template values (year, runNumber, userLastName) from experiment
 */
export function getTemplateValues(experimentId: string | null): TemplateValues {
    const defaults: TemplateValues = {
        year: new Date().getFullYear(),
        runNumber: '',
        userLastName: DEFAULT_USER_LASTNAME
    };
    
    if (!experimentId) return defaults;
    
    const experiment = getExperimentDataFromRow(experimentId);
    if (!experiment) return defaults;
    
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
export function formatDate(dateString: string | undefined | null): string {
    if (!isValidValue(dateString)) return NA_VALUE;
    
    const date = new Date(dateString as string);
    if (isNaN(date.getTime())) return NA_VALUE;
    
    return date.toLocaleDateString();
}

/**
 * Creates a person display with optional email link
 */
export function formatPersonWithEmail(name: string | undefined | null, email?: string | undefined | null): string {
    if (!isValidValue(name)) return NA_VALUE;
    
    if (isValidValue(email)) {
        return `${escapeHtml(name as string)} <br><small><a href="mailto:${escapeHtml(email as string)}">${escapeHtml(email as string)}</a></small>`;
    }
    
    return escapeHtml(name as string);
}
