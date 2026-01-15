/* ----------------------------------------------------------------------------------
 * Project: BeamtimeApp
 * File: beamtime_app/static/src/utils/constants.ts
 * ----------------------------------------------------------------------------------
 * Purpose:
 * This file defines application-wide constants used throughout the frontend.
 * ----------------------------------------------------------------------------------
 * Author: Christofanis Skordas
 *
 * Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
 * Copyright (C) 2025-2026 NSF SEES, USA
 * ---------------------------------------------------------------------------------- */
export const DEBOUNCE_DELAYS = {
    VALIDATION: 500,
    SEARCH: 300
};
export const TOAST_DELAY = 4000;
export const DEFAULT_USER_LASTNAME = 'user';
export const NA_VALUE = 'N/A';
export const ALERT_AUTO_DISMISS_DELAY = 5000;
export const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};
export const ALERT_TYPES = {
    ERROR: 'error',
    SUCCESS: 'success',
    INFO: 'info',
    WARNING: 'warning'
};
export const SORT_DIRECTIONS = {
    ASC: 'asc',
    DESC: 'desc'
};
export const DEFAULT_SORT = {
    column: 'experiment',
    direction: SORT_DIRECTIONS.ASC
};
export const SESSION_STORAGE_KEYS = {
    TABLE_SORT: 'tableSort'
};
//# sourceMappingURL=constants.js.map