/* ----------------------------------------------------------------------------------
 * Project: BeamtimeApp
 * File: beamtime_app/static/src/features/sorting.ts
 * ----------------------------------------------------------------------------------
 * Purpose:
 * This file implements table sorting functionality with state persistence
 * using sessionStorage.
 * ----------------------------------------------------------------------------------
 * Author: Christofanis Skordas
 *
 * Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
 * Copyright (C) 2025-2026 NSF SEES, USA
 * ---------------------------------------------------------------------------------- */

import type { SortState } from '../types/index.js';
import { SORT_DIRECTIONS, DEFAULT_SORT, SESSION_STORAGE_KEYS } from '../utils/constants.js';
import { safeJsonParse } from '../utils/dom.js';

let currentSortState: SortState[] = [];

/**
 * Gets the next sort direction
 */
function getNextSortDirection(currentDirection: 'asc' | 'desc'): 'asc' | 'desc' {
    return currentDirection === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.DESC : SORT_DIRECTIONS.ASC;
}

/**
 * Updates sort state
 */
export function updateSortState(column: string, direction: 'asc' | 'desc'): void {
    // Clear all previous sorts - only show one column sorted at a time
    currentSortState = [{ column, direction }];
    
    // Save sort state to sessionStorage
    saveSortStateToSession();
}

/**
 * Saves sort state to sessionStorage
 */
function saveSortStateToSession(): void {
    try {
        sessionStorage.setItem(SESSION_STORAGE_KEYS.TABLE_SORT, JSON.stringify(currentSortState));
    } catch (e) {
        console.warn('Could not save sort state to sessionStorage:', e);
    }
}

/**
 * Loads sort state from sessionStorage
 */
function loadSortStateFromSession(): SortState[] | null {
    try {
        const saved = sessionStorage.getItem(SESSION_STORAGE_KEYS.TABLE_SORT);
        if (saved) {
            const parsedState = safeJsonParse<SortState[]>(saved, null);
            if (Array.isArray(parsedState) && parsedState.length > 0) {
                return parsedState;
            }
        }
    } catch (e) {
        console.warn('Could not load sort state from sessionStorage:', e);
    }
    return null;
}

/**
 * Updates sort UI indicators
 */
export function updateSortUI(): void {
    // Clear all sort classes from all headers first
    document.querySelectorAll('.sortable-header').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
    });
    
    // Then apply the current sort class to the active column
    if (currentSortState.length > 0) {
        const activeSort = currentSortState[0];
        const activeHeader = document.querySelector(`[data-column="${activeSort.column}"]`);
        if (activeHeader) {
            activeHeader.classList.add(`sort-${activeSort.direction}`);
        }
    }
}

/**
 * Gets cell value for sorting
 */
function getCellValue(row: HTMLTableRowElement, column: string): string | number {
    switch (column) {
        case 'proposal':
            return row.querySelector('.experiment-proposal')?.textContent.trim() || '';
        case 'experiment':
            // Convert ESAF to number for proper sorting
            const esafText = row.querySelector('.experiment-id')?.textContent.trim() || '0';
            return parseInt(esafText, 10) || 0;
        case 'spokesperson':
            return row.querySelector('.experiment-spokesperson')?.textContent.trim().toLowerCase() || '';
        case 'title':
            return row.querySelector('.experiment-title-text')?.textContent.trim().toLowerCase() || '';
        case 'status':
            return row.querySelector('.status-badge')?.textContent.trim().toLowerCase() || '';
        default: 
            return '';
    }
}

/**
 * Sorts table by current sort state
 */
export function sortTableByState(tableId: string): void {
    const tableBody = document.getElementById(tableId);
    if (!tableBody) return;
    
    const rows = Array.from(tableBody.querySelectorAll<HTMLTableRowElement>('tr'));

    rows.sort((a, b) => {
        for (const { column, direction } of currentSortState) {
            const aVal = getCellValue(a, column);
            const bVal = getCellValue(b, column);

            if (aVal < bVal) return direction === SORT_DIRECTIONS.ASC ? -1 : 1;
            if (aVal > bVal) return direction === SORT_DIRECTIONS.ASC ? 1 : -1;
        }
        return 0;
    });

    tableBody.innerHTML = '';
    rows.forEach(row => tableBody.appendChild(row));
}

/**
 * Sets default sorting
 */
export function setDefaultSorting(): void {
    // Try to load saved sort state first
    const savedState = loadSortStateFromSession();
    
    if (savedState) {
        // Use saved sort state
        currentSortState = savedState;
    } else {
        // Use default sort (ESAF column in ascending order)
        currentSortState = [{ column: DEFAULT_SORT.column, direction: DEFAULT_SORT.direction }];
        saveSortStateToSession();
    }
    
    updateSortUI();
    sortTableByState('experimentsTableBody');
}

/**
 * Initializes sort handlers
 */
export function initializeSortHandlers(): void {
    const sortableHeaders = document.querySelectorAll<HTMLElement>('.sortable-header');

    sortableHeaders.forEach(header => {
        const column = header.dataset.column;
        if (!column) return;
        
        header.addEventListener('click', () => {
            // Determine next sort direction
            const currentSort = currentSortState.find(s => s.column === column);
            const nextDirection = currentSort 
                ? getNextSortDirection(currentSort.direction)
                : SORT_DIRECTIONS.ASC;
            
            updateSortState(column, nextDirection);
            updateSortUI();
            sortTableByState('experimentsTableBody');
        });
    });
}

/**
 * Gets current sort state (for external access)
 */
export function getCurrentSortState(): SortState[] {
    return [...currentSortState];
}
