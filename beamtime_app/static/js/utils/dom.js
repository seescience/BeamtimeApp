/* ----------------------------------------------------------------------------------
 * Project: BeamtimeApp
 * File: beamtime_app/static/src/utils/dom.ts
 * ----------------------------------------------------------------------------------
 * Purpose:
 * This file provides DOM utility functions for HTML escaping, JSON parsing,
 * and value validation.
 * ----------------------------------------------------------------------------------
 * Author: Christofanis Skordas
 *
 * Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
 * Copyright (C) 2025-2026 NSF SEES, USA
 * ---------------------------------------------------------------------------------- */
import { NA_VALUE } from './constants.js';
/**
 * Escapes HTML to prevent XSS attacks
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
/**
 * Checks if a value is valid (not null, undefined, empty, or 'N/A')
 */
export function isValidValue(value) {
    return Boolean(value && value !== NA_VALUE && String(value).trim() !== '');
}
/**
 * Safely parses JSON with error handling
 */
export function safeJsonParse(jsonString, defaultValue = null) {
    try {
        return JSON.parse(jsonString);
    }
    catch (error) {
        console.warn('JSON parse error:', error);
        return defaultValue;
    }
}
//# sourceMappingURL=dom.js.map