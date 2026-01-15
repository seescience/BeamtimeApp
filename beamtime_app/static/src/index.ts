/* ----------------------------------------------------------------------------------
 * Project: BeamtimeApp
 * File: beamtime_app/static/src/index.ts
 * ----------------------------------------------------------------------------------
 * Purpose:
 * This file is the main entry point for BeamtimeApp frontend.
 * It initializes all features when the DOM is ready.
 * ----------------------------------------------------------------------------------
 * Author: Christofanis Skordas
 *
 * Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
 * Copyright (C) 2025-2026 NSF SEES, USA
 * ---------------------------------------------------------------------------------- */

import { initializeSearchFunctionality } from './features/search.js';
import { initializeSortHandlers, setDefaultSorting } from './features/sorting.js';
import { setAcknowledgmentOptions } from './state/index.js';
import type { AcknowledgmentOption } from './types/index.js';

/**
 * Fetches acknowledgment options from the server
 */
async function fetchAcknowledgmentOptions(): Promise<void> {
    try {
        const response = await fetch('/api/v1/get_acknowledgments');
        if (!response.ok) {
            throw new Error('Failed to fetch acknowledgments');
        }
        const data: AcknowledgmentOption[] = await response.json();
        setAcknowledgmentOptions(data);
    } catch (error) {
        console.error('Error fetching acknowledgment options:', error);
    }
}

/**
 * Initializes filter form auto-submit functionality
 */
function initializeFilterFormAutoSubmit(): void {
    const filterForm = document.getElementById('filterForm') as HTMLFormElement | null;
    const clearFiltersBtn = document.getElementById('clearFiltersBtn') as HTMLButtonElement | null;
    
    if (filterForm) {
        const selects = filterForm.querySelectorAll<HTMLSelectElement>('select');
        selects.forEach(select => {
            select.addEventListener('change', () => {
                filterForm.submit();
            });
        });
    }
    
    // Clear filters functionality
    if (clearFiltersBtn && filterForm) {
        clearFiltersBtn.addEventListener('click', () => {
            const selects = filterForm.querySelectorAll<HTMLSelectElement>('select');
            const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
            
            selects.forEach(select => {
                select.value = '';
            });
            
            if (searchInput) {
                searchInput.value = '';
                // Trigger search to show all rows
                import('./features/search.js').then(({ performClientSideSearch }) => {
                    performClientSideSearch('');
                });
            }
            
            filterForm.submit();
        });
    }
}

/**
 * Initializes table event handlers
 */
function initializeTableHandlers(): void {
    const tableBody = document.getElementById('experimentsTableBody');
    if (!tableBody) return;
    
    // Handle view and edit button clicks
    tableBody.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const viewBtn = target.closest('.btn-view') as HTMLElement | null;
        const editBtn = target.closest('.btn-edit') as HTMLElement | null;
        
        if (viewBtn) {
            const experimentId = viewBtn.getAttribute('data-experiment-id');
            if (experimentId) {
                // Import and call openExperimentViewModal
                import('./features/experiment-modal.js').then(({ openExperimentViewModal }) => {
                    openExperimentViewModal(experimentId);
                });
            }
        } else if (editBtn) {
            const experimentId = editBtn.getAttribute('data-experiment-id');
            if (experimentId) {
                // Import and call openExperimentModal
                import('./features/experiment-modal.js').then(({ openExperimentModal }) => {
                    openExperimentModal(experimentId, 'edit');
                });
            }
        }
    });
}

/**
 * Main initialization function
 */
function initializeApp(): void {
    // Initialize features
    fetchAcknowledgmentOptions();
    initializeTableHandlers();
    initializeFilterFormAutoSubmit();
    initializeSortHandlers();
    initializeSearchFunctionality();
    
    // Set default sorting by ESAF column
    setDefaultSorting();
    
    // Initialize experiment modal (lazy load)
    import('./features/experiment-modal.js').then(({ initializeExperimentModal }) => {
        initializeExperimentModal();
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
