/* ----------------------------------------------------------------------------------
 * Project: BeamtimeApp
 * File: beamtime_app/static/src/features/path-validation.ts
 * ----------------------------------------------------------------------------------
 * Purpose:
 * This file implements data path validation functionality with debouncing
 * and server-side validation.
 * ----------------------------------------------------------------------------------
 * Author: Christofanis Skordas
 *
 * Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
 * Copyright (C) 2025-2026 NSF SEES, USA
 * ---------------------------------------------------------------------------------- */

import type { PathValidationResult } from '../types/index.js';
import { DEBOUNCE_DELAYS } from '../utils/constants.js';

let validationTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounces path validation
 */
export function debounceValidation(validateFn: () => void): void {
    if (validationTimeout) {
        clearTimeout(validationTimeout);
    }
    validationTimeout = setTimeout(validateFn, DEBOUNCE_DELAYS.VALIDATION);
}

/**
 * Validates if a data path exists
 */
export async function validateDataPath(path: string): Promise<PathValidationResult> {
    if (!path || !path.trim()) {
        return { exists: false, valid: false, message: 'Please enter a path' };
    }

    try {
        const response = await fetch('/api/v1/validate_data_path', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path: path.trim() })
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const result = await response.json();
        
        if (result.error) {
            return {
                exists: null,
                valid: false,
                message: result.error
            };
        }
        
        return {
            exists: result.exists,
            valid: result.valid,
            message: result.message,
            normalized: result.normalized
        };
    } catch (error) {
        console.error('Error validating path:', error);
        return {
            exists: null,
            valid: false,
            message: 'Unable to validate path'
        };
    }
}

/**
 * Validates the current path in the form
 */
export function validateCurrentPath(
    pathInputId: string,
    messageElementId: string,
    onResult: (result: PathValidationResult) => void
): void {
    const pathInput = document.getElementById(pathInputId) as HTMLInputElement | null;
    if (!pathInput) return;
    
    const path = pathInput.value.trim();
    
    if (!path) {
        clearValidationMessage(messageElementId);
        return;
    }
    
    updateValidationMessage(messageElementId, 'muted', 'Validating...');
    
    validateDataPath(path)
        .then(result => {
            onResult(result);
        })
        .catch(error => {
            console.error('Validation error:', error);
            updateValidationMessage(messageElementId, 'danger', 'Validation failed');
        });
}

/**
 * Updates validation message display
 */
export function updateValidationMessage(elementId: string, type: string, message: string): void {
    const messageEl = document.getElementById(elementId);
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.className = `small text-${type}`;
}

/**
 * Clears validation message
 */
export function clearValidationMessage(elementId: string): void {
    const messageEl = document.getElementById(elementId);
    if (messageEl) {
        messageEl.textContent = '';
        messageEl.className = 'small';
    }
}
