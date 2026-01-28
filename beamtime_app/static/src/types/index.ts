/* ----------------------------------------------------------------------------------
 * Project: BeamtimeApp
 * File: beamtime_app/static/src/types/index.ts
 * ----------------------------------------------------------------------------------
 * Purpose:
 * This file defines TypeScript type definitions and interfaces for BeamtimeApp.
 * ----------------------------------------------------------------------------------
 * Author: Christofanis Skordas
 *
 * Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
 * Copyright (C) 2025-2026 NSF SEES, USA
 * ---------------------------------------------------------------------------------- */

// Bootstrap Modal type (extended from bootstrap namespace)
export interface BootstrapModal {
    show(): void;
    hide(): void;
    dispose(): void;
}

// Experiment data structure
export interface Experiment {
    id?: string;
    title?: string;
    proposal?: string;
    start_date?: string;
    end_date?: string;
    run_id?: string | number;
    spokesperson_name?: string;
    spokesperson_email?: string;
    beamline_name?: string;
    beamline_contact_name?: string;
    beamline_contact_email?: string;
    description?: string;
    folder?: string;
    process_status?: string;
    sees_doi?: string;
    esaf_pdf_file?: string;
}

// Template values for data path generation
export interface TemplateValues {
    year: number;
    runNumber: string;
    userLastName: string;
}

// Sort state
export interface SortState {
    column: string;
    direction: 'asc' | 'desc';
}

// Acknowledgment option
export interface AcknowledgmentOption {
    id: number;
    title: string;
    description?: string;
}

// Path validation result
export interface PathValidationResult {
    exists: boolean | null;
    valid: boolean;
    message: string;
    normalized?: string;
}

// Notification type
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// Alert type
export type AlertType = 'error' | 'success' | 'info' | 'warning';

// Toast configuration
export interface ToastConfig {
    class: string;
    icon: string;
}

// Experiment form data
export interface ExperimentFormData {
    experiment_id: string | null;
    experiment_number: string;
    title: string;
    data_path: string | null;
    pvlog_path: string | null;
    doi: boolean;
    draft_doi: boolean;
    proposal_number: string | null;
    acknowledgments: number[];
}
