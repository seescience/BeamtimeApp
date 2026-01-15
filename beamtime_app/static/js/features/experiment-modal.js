/* ----------------------------------------------------------------------------------
 * Project: BeamtimeApp
 * File: beamtime_app/static/src/features/experiment-modal.ts
 * ----------------------------------------------------------------------------------
 * Purpose:
 * This file handles experiment modal functionality for viewing and editing
 * experiment details.
 * ----------------------------------------------------------------------------------
 * Author: Christofanis Skordas
 *
 * Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
 * Copyright (C) 2025-2026 NSF SEES, USA
 * ---------------------------------------------------------------------------------- */
import { NA_VALUE } from '../utils/constants.js';
import { formatDate, formatPersonWithEmail } from '../utils/experiment.js';
import { escapeHtml, isValidValue } from '../utils/dom.js';
import { setCurrentEditingExperiment, setExperimentModal, setExperimentViewModal } from '../state/index.js';
let experimentModalInstance = null;
let experimentViewModalInstance = null;
/**
 * Initializes experiment modals
 */
export function initializeExperimentModal() {
    const modalElement = document.getElementById('experimentModal');
    const viewModalElement = document.getElementById('experimentViewModal');
    if (modalElement) {
        const Bootstrap = window.bootstrap;
        if (Bootstrap && Bootstrap.Modal) {
            experimentModalInstance = new Bootstrap.Modal(modalElement);
            setExperimentModal(experimentModalInstance);
        }
    }
    if (viewModalElement) {
        const Bootstrap = window.bootstrap;
        if (Bootstrap && Bootstrap.Modal) {
            experimentViewModalInstance = new Bootstrap.Modal(viewModalElement);
            setExperimentViewModal(experimentViewModalInstance);
        }
    }
}
/**
 * Opens experiment modal for viewing or editing
 */
export function openExperimentModal(experimentId, _mode = 'edit') {
    setCurrentEditingExperiment(experimentId);
    if (experimentModalInstance) {
        experimentModalInstance.show();
    }
}
/**
 * Opens read-only view modal
 */
export function openExperimentViewModal(experimentId) {
    const row = document.querySelector(`tr[data-experiment-id="${experimentId}"]`);
    if (!row)
        return;
    try {
        // Get full experiment data from the data attribute
        const experimentDataStr = row.getAttribute('data-experiment-data');
        if (experimentDataStr) {
            const experiment = JSON.parse(experimentDataStr);
            populateViewModalFull(experiment);
        }
        else {
            // Fallback to basic data from DOM
            const proposal = row.querySelector('.experiment-proposal')?.textContent.trim() || '';
            const experimentNumber = row.querySelector('.experiment-id')?.textContent.trim() || '';
            const title = row.querySelector('.experiment-title-text')?.textContent.trim() || '';
            const statusBadge = row.querySelector('.status-badge');
            const dataPath = row.getAttribute('data-user-folder') || '';
            populateViewModalBasic(title, experimentNumber, proposal, statusBadge, dataPath);
        }
    }
    catch (error) {
        console.error('Error parsing experiment data:', error);
        // Fallback to basic data from DOM
        const proposal = row.querySelector('.experiment-proposal')?.textContent.trim() || '';
        const experimentNumber = row.querySelector('.experiment-id')?.textContent.trim() || '';
        const title = row.querySelector('.experiment-title-text')?.textContent.trim() || '';
        const statusBadge = row.querySelector('.status-badge');
        const dataPath = row.getAttribute('data-user-folder') || '';
        populateViewModalBasic(title, experimentNumber, proposal, statusBadge, dataPath);
    }
    if (!experimentViewModalInstance) {
        const viewEl = document.getElementById('experimentViewModal');
        if (viewEl) {
            const Bootstrap = window.bootstrap;
            if (Bootstrap && Bootstrap.Modal) {
                experimentViewModalInstance = new Bootstrap.Modal(viewEl);
                setExperimentViewModal(experimentViewModalInstance);
            }
        }
    }
    if (experimentViewModalInstance) {
        experimentViewModalInstance.show();
    }
}
/**
 * Populates view modal with basic information (fallback)
 */
function populateViewModalBasic(title, experimentNumber, proposal, statusBadge, dataPath) {
    const titleEl = document.getElementById('detailViewTitle');
    const esafEl = document.getElementById('detailViewExperimentNumber');
    const proposalEl = document.getElementById('detailViewProposal');
    const statusEl = document.getElementById('detailViewStatus');
    const dataPathEl = document.getElementById('detailViewDataPath');
    if (titleEl)
        titleEl.textContent = title || NA_VALUE;
    if (esafEl)
        esafEl.textContent = experimentNumber || NA_VALUE;
    if (proposalEl)
        proposalEl.textContent = proposal || NA_VALUE;
    if (statusEl) {
        statusEl.innerHTML = '';
        if (statusBadge) {
            const clone = statusBadge.cloneNode(true);
            statusEl.appendChild(clone);
        }
        else {
            statusEl.textContent = NA_VALUE;
        }
    }
    if (dataPathEl) {
        dataPathEl.textContent = isValidValue(dataPath) ? dataPath : NA_VALUE;
    }
    // Set other fields to N/A
    const fields = ['detailViewBeamline', 'detailViewDescription', 'detailViewStartDate',
        'detailViewEndDate', 'detailViewSpokesperson', 'detailViewBeamlineContact',
        'detailViewDoi', 'detailViewEsafPdf'];
    fields.forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if (el)
            el.textContent = NA_VALUE;
    });
}
/**
 * Populates view modal with full experiment data
 */
function populateViewModalFull(experiment) {
    const titleEl = document.getElementById('detailViewTitle');
    const esafEl = document.getElementById('detailViewExperimentNumber');
    const proposalEl = document.getElementById('detailViewProposal');
    const statusEl = document.getElementById('detailViewStatus');
    const beamlineEl = document.getElementById('detailViewBeamline');
    const descriptionEl = document.getElementById('detailViewDescription');
    const dataPathEl = document.getElementById('detailViewDataPath');
    const startDateEl = document.getElementById('detailViewStartDate');
    const endDateEl = document.getElementById('detailViewEndDate');
    const spokespersonEl = document.getElementById('detailViewSpokesperson');
    const beamlineContactEl = document.getElementById('detailViewBeamlineContact');
    const doiEl = document.getElementById('detailViewDoi');
    const esafPdfEl = document.getElementById('detailViewEsafPdf');
    if (titleEl)
        titleEl.textContent = experiment.title || NA_VALUE;
    if (esafEl)
        esafEl.textContent = experiment.id || NA_VALUE;
    if (proposalEl)
        proposalEl.textContent = experiment.proposal || NA_VALUE;
    // Status badge
    if (statusEl) {
        statusEl.innerHTML = '';
        if (isValidValue(experiment.process_status)) {
            const badge = document.createElement('span');
            badge.className = `status-badge status-${experiment.process_status.toLowerCase().replace(/\s+/g, '-')}`;
            badge.textContent = experiment.process_status;
            statusEl.appendChild(badge);
        }
        else {
            statusEl.textContent = NA_VALUE;
        }
    }
    if (beamlineEl)
        beamlineEl.textContent = experiment.beamline_name || NA_VALUE;
    if (descriptionEl)
        descriptionEl.textContent = experiment.description || NA_VALUE;
    if (dataPathEl) {
        const folder = experiment.folder;
        dataPathEl.textContent = isValidValue(folder) ? folder : NA_VALUE;
    }
    // Format dates
    if (startDateEl) {
        startDateEl.textContent = formatDate(experiment.start_date);
    }
    if (endDateEl) {
        endDateEl.textContent = formatDate(experiment.end_date);
    }
    // Personnel with email links
    if (spokespersonEl) {
        if (isValidValue(experiment.spokesperson_name)) {
            spokespersonEl.innerHTML = formatPersonWithEmail(experiment.spokesperson_name, experiment.spokesperson_email);
        }
        else {
            spokespersonEl.textContent = NA_VALUE;
        }
    }
    if (beamlineContactEl) {
        if (isValidValue(experiment.beamline_contact_name)) {
            beamlineContactEl.innerHTML = formatPersonWithEmail(experiment.beamline_contact_name, experiment.beamline_contact_email);
        }
        else {
            beamlineContactEl.textContent = NA_VALUE;
        }
    }
    // DOI with link
    if (doiEl) {
        const doi = experiment.sees_doi;
        if (isValidValue(doi)) {
            const doiStr = doi;
            doiEl.innerHTML = `<a href="https://doi.org/${escapeHtml(doiStr)}" target="_blank" rel="noopener noreferrer">${escapeHtml(doiStr)}</a>`;
        }
        else {
            doiEl.textContent = NA_VALUE;
        }
    }
    // ESAF PDF with link
    if (esafPdfEl) {
        const pdfFile = experiment.esaf_pdf_file;
        if (isValidValue(pdfFile)) {
            const pdfStr = pdfFile;
            esafPdfEl.innerHTML = `<a href="${escapeHtml(pdfStr)}" target="_blank" rel="noopener noreferrer">View PDF</a>`;
        }
        else {
            esafPdfEl.textContent = NA_VALUE;
        }
    }
}
//# sourceMappingURL=experiment-modal.js.map