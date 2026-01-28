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
import { formatDate, formatPersonWithEmail, getTemplateValues, getExperimentDataFromRow } from '../utils/experiment.js';
import { escapeHtml, isValidValue } from '../utils/dom.js';
import { setCurrentEditingExperiment, setExperimentModal, setExperimentViewModal, currentEditingExperiment } from '../state/index.js';
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
            // Initialize handlers when modal is shown (ensures DOM is ready)
            modalElement.addEventListener('shown.bs.modal', () => {
                initializeModalHandlers();
            });
        }
        // Initialize handlers immediately (in case modal is already in DOM)
        initializeModalHandlers();
    }
    if (viewModalElement) {
        const Bootstrap = window.bootstrap;
        if (Bootstrap && Bootstrap.Modal) {
            experimentViewModalInstance = new Bootstrap.Modal(viewModalElement);
            setExperimentViewModal(experimentViewModalInstance);
        }
    }
}
// Store handler functions to prevent duplicate listeners
let buttonClickHandler = null;
let menuClickHandler = null;
let outsideClickHandler = null;
/**
 * Initializes event handlers for the experiment modal
 */
function initializeModalHandlers() {
    // Data path dropdown button
    const dropdownBtn = document.getElementById('dataPathDropdownBtn');
    const dropdownMenu = document.getElementById('dataPathTemplates');
    if (!dropdownBtn || !dropdownMenu) {
        // Elements not found - this is OK if modal hasn't been rendered yet
        return;
    }
    // Remove old listeners if they exist
    if (buttonClickHandler) {
        dropdownBtn.removeEventListener('click', buttonClickHandler);
    }
    if (menuClickHandler) {
        dropdownMenu.removeEventListener('click', menuClickHandler);
    }
    if (outsideClickHandler) {
        document.removeEventListener('click', outsideClickHandler);
    }
    // Create new handler functions
    buttonClickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Toggle dropdown visibility
        const isVisible = dropdownMenu.classList.contains('show');
        if (isVisible) {
            dropdownMenu.classList.remove('show');
        }
        else {
            dropdownMenu.classList.add('show');
        }
    };
    menuClickHandler = (e) => {
        const target = e.target;
        const dropdownItem = target.closest('.dropdown-item');
        if (dropdownItem) {
            e.preventDefault();
            e.stopPropagation();
            const template = dropdownItem.getAttribute('data-template');
            const user = dropdownItem.getAttribute('data-user');
            if (template) {
                applyTemplateToDataPath(template, user);
            }
            // Hide dropdown
            dropdownMenu.classList.remove('show');
        }
    };
    outsideClickHandler = (e) => {
        const target = e.target;
        if (dropdownMenu.classList.contains('show') &&
            !dropdownBtn.contains(target) &&
            !dropdownMenu.contains(target)) {
            dropdownMenu.classList.remove('show');
        }
    };
    // Add event listeners
    dropdownBtn.addEventListener('click', buttonClickHandler);
    dropdownMenu.addEventListener('click', menuClickHandler);
    document.addEventListener('click', outsideClickHandler);
    // PVLogger file selection button
    const selectFileBtn = document.getElementById('selectFileBtn');
    const fileInput = document.getElementById('pvLoggerPath');
    const fileDisplay = document.getElementById('pvLoggerPathDisplay');
    const clearFileBtn = document.getElementById('clearFileBtn');
    const pvLoggerPathValue = document.getElementById('pvLoggerPathValue');
    if (selectFileBtn && fileInput && fileDisplay) {
        selectFileBtn.addEventListener('click', () => {
            fileInput.click();
        });
        fileInput.addEventListener('change', (e) => {
            const target = e.target;
            const file = target.files?.[0];
            if (file) {
                fileDisplay.value = file.name;
                if (clearFileBtn) {
                    clearFileBtn.style.display = '';
                }
                // Store file path in hidden input
                if (pvLoggerPathValue) {
                    pvLoggerPathValue.value = file.name;
                }
            }
        });
    }
    if (clearFileBtn && fileInput && fileDisplay) {
        clearFileBtn.addEventListener('click', () => {
            if (fileInput) {
                fileInput.value = '';
            }
            fileDisplay.value = '';
            clearFileBtn.style.display = 'none';
            if (pvLoggerPathValue) {
                pvLoggerPathValue.value = '';
            }
        });
    }
}
/**
 * Applies a template to the data path input, replacing placeholders
 */
function applyTemplateToDataPath(template, user) {
    const dataPathInput = document.getElementById('dataPath');
    if (!dataPathInput)
        return;
    const templateValues = getTemplateValues(currentEditingExperiment);
    // Replace placeholders in template
    let path = template;
    // Replace {year} with actual year (always available, defaults to current year)
    path = path.replace(/\{year\}/g, templateValues.year.toString());
    // Replace {run} or {runNumber} with run number (use empty string if not available)
    const runValue = templateValues.runNumber || '';
    path = path.replace(/\{run\}/g, runValue);
    path = path.replace(/\{runNumber\}/g, runValue);
    // Replace {user} or {userLastName} with user last name
    // Prefer the user from technique, fallback to spokesperson's last name, then default
    const userValue = user || templateValues.userLastName || 'user';
    path = path.replace(/\{user\}/g, userValue);
    path = path.replace(/\{userLastName\}/g, templateValues.userLastName || 'user');
    // Replace {esaf} or {experiment} with experiment number if available
    if (currentEditingExperiment) {
        const experiment = getExperimentDataFromRow(currentEditingExperiment);
        if (experiment?.id) {
            path = path.replace(/\{esaf\}/g, experiment.id);
            path = path.replace(/\{experiment\}/g, experiment.id);
        }
        else {
            // If experiment ID not available, remove these placeholders
            path = path.replace(/\{esaf\}/g, '');
            path = path.replace(/\{experiment\}/g, '');
        }
    }
    else {
        // If no experiment is being edited, remove these placeholders
        path = path.replace(/\{esaf\}/g, '');
        path = path.replace(/\{experiment\}/g, '');
    }
    dataPathInput.value = path;
}
/**
 * Populates the edit modal form with experiment data
 */
function populateEditModal(experiment) {
    // Basic information
    const experimentIdEl = document.getElementById('experimentId');
    const titleEl = document.getElementById('experimentTitle');
    const experimentNumberEl = document.getElementById('experimentNumber');
    const proposalNumberEl = document.getElementById('proposalNumber');
    if (experimentIdEl)
        experimentIdEl.value = experiment.id || '';
    if (titleEl)
        titleEl.value = experiment.title || '';
    if (experimentNumberEl)
        experimentNumberEl.value = experiment.id || '';
    if (proposalNumberEl)
        proposalNumberEl.value = experiment.proposal || '';
    // Data path
    const dataPathEl = document.getElementById('dataPath');
    if (dataPathEl) {
        dataPathEl.value = isValidValue(experiment.folder) ? experiment.folder : '';
    }
    // PVLogger path (if exists, show in display field)
    const pvLoggerPathDisplay = document.getElementById('pvLoggerPathDisplay');
    const pvLoggerPathValue = document.getElementById('pvLoggerPathValue');
    const clearFileBtn = document.getElementById('clearFileBtn');
    // Note: PVLogger path might not be in experiment data
    if (pvLoggerPathDisplay) {
        pvLoggerPathDisplay.value = '';
        pvLoggerPathDisplay.placeholder = 'No file selected';
    }
    if (pvLoggerPathValue) {
        pvLoggerPathValue.value = '';
    }
    if (clearFileBtn) {
        clearFileBtn.style.display = 'none';
    }
    // Acknowledgments - need to check if experiment has acknowledgments
    const acknowledgmentCheckboxes = document.querySelectorAll('.acknowledgment-checkbox');
    acknowledgmentCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    const selectedAcknowledgmentsText = document.getElementById('selectedAcknowledgmentsText');
    if (selectedAcknowledgmentsText) {
        selectedAcknowledgmentsText.textContent = 'No acknowledgments selected';
        selectedAcknowledgmentsText.className = 'text-muted';
    }
    const selectedAcknowledgmentsHidden = document.getElementById('selectedAcknowledgments');
    if (selectedAcknowledgmentsHidden) {
        selectedAcknowledgmentsHidden.value = '';
    }
    // DOI options - check if experiment already has a DOI
    const createDoiEl = document.getElementById('createDoi');
    const draftDoiEl = document.getElementById('draftDoi');
    if (createDoiEl) {
        // If experiment already has a DOI, uncheck create DOI
        createDoiEl.checked = !isValidValue(experiment.sees_doi);
    }
    if (draftDoiEl) {
        draftDoiEl.checked = false;
    }
    // Clear validation message
    const pathValidationMessage = document.getElementById('pathValidationMessage');
    if (pathValidationMessage) {
        pathValidationMessage.textContent = '';
        pathValidationMessage.className = 'small';
    }
}
/**
 * Opens experiment modal for viewing or editing
 */
export function openExperimentModal(experimentId, _mode = 'edit') {
    setCurrentEditingExperiment(experimentId);
    // Get experiment data from the table row
    const row = document.querySelector(`tr[data-experiment-id="${experimentId}"]`);
    if (row) {
        try {
            // Get full experiment data from the data attribute
            const experimentDataStr = row.getAttribute('data-experiment-data');
            if (experimentDataStr) {
                const experiment = JSON.parse(experimentDataStr);
                populateEditModal(experiment);
            }
            else {
                // Fallback: populate with basic data from DOM
                const folderAttr = row.getAttribute('data-user-folder');
                const experiment = {
                    id: row.querySelector('.experiment-id')?.textContent?.trim() || '',
                    title: row.querySelector('.experiment-title-text')?.textContent?.trim() || '',
                    proposal: row.querySelector('.experiment-proposal')?.textContent?.trim() || '',
                    folder: folderAttr || undefined
                };
                populateEditModal(experiment);
            }
        }
        catch (error) {
            console.error('Error parsing experiment data:', error);
            // Fallback: populate with basic data from DOM
            const folderAttr = row.getAttribute('data-user-folder');
            const experiment = {
                id: row.querySelector('.experiment-id')?.textContent?.trim() || '',
                title: row.querySelector('.experiment-title-text')?.textContent?.trim() || '',
                proposal: row.querySelector('.experiment-proposal')?.textContent?.trim() || '',
                folder: folderAttr || undefined
            };
            populateEditModal(experiment);
        }
    }
    // Ensure handlers are initialized before showing modal
    initializeModalHandlers();
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