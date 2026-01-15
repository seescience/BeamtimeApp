/* ----------------------------------------------------------------------------------
 * Project: BeamtimeApp
 * File: beamtime_app/static/src/features/search.ts
 * ----------------------------------------------------------------------------------
 * Purpose:
 * This file implements client-side search functionality for the experiments table
 * with debouncing for performance.
 * ----------------------------------------------------------------------------------
 * Author: Christofanis Skordas
 *
 * Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
 * Copyright (C) 2025-2026 NSF SEES, USA
 * ---------------------------------------------------------------------------------- */
import { DEBOUNCE_DELAYS } from '../utils/constants.js';
let searchTimeout = null;
/**
 * Performs client-side search on the experiments table
 */
export function performClientSideSearch(searchTerm) {
    const tableBody = document.getElementById('experimentsTableBody');
    if (!tableBody)
        return;
    const rows = tableBody.querySelectorAll('.experiment-row');
    const term = searchTerm.toLowerCase().trim();
    rows.forEach(row => {
        if (!term) {
            row.style.display = '';
            return;
        }
        // Search across proposal, experiment ID, spokesperson, and title
        const proposal = row.querySelector('.experiment-proposal')?.textContent.toLowerCase() || '';
        const experimentId = row.querySelector('.experiment-id')?.textContent.toLowerCase() || '';
        const spokesperson = row.querySelector('.experiment-spokesperson')?.textContent.toLowerCase() || '';
        const title = row.querySelector('.experiment-title')?.textContent.toLowerCase() || '';
        const matches = proposal.includes(term) ||
            experimentId.includes(term) ||
            spokesperson.includes(term) ||
            title.includes(term);
        row.style.display = matches ? '' : 'none';
    });
}
/**
 * Initializes search functionality
 */
export function initializeSearchFunctionality() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput)
        return;
    // Real-time search with debouncing
    searchInput.addEventListener('input', () => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(() => {
            performClientSideSearch(searchInput.value);
        }, DEBOUNCE_DELAYS.SEARCH);
    });
    // Initial search if there's a value
    if (searchInput.value.trim()) {
        performClientSideSearch(searchInput.value);
    }
}
//# sourceMappingURL=search.js.map