/* ----------------------------------------------------------------------------------
 * Project: BeamtimeApp
 * File: beamtime_app/static/js/utils.js
 * ----------------------------------------------------------------------------------
 * Purpose:
 * This file defines JavaScript utility functions for the BeamtimeApp.
 * ----------------------------------------------------------------------------------
 * Author: Christofanis Skordas
 *
 * Copyright (C) 2025 GSECARS, The University of Chicago, USA
 * Copyright (C) 2025 NSF SEES, USA
 * ---------------------------------------------------------------------------------- */

let acknowledgmentOptions = [];
let dataPathTemplate = '';
let currentSortState = [];
let experimentModal = null;
let experimentViewModal = null;
let currentEditingExperiment = null;

// Initialize the experiment modals
function initializeExperimentModal() {
    // Edit/queue modal
    experimentModal = new bootstrap.Modal(document.getElementById('experimentModal'));

    // View-only modal
    const viewEl = document.getElementById('experimentViewModal');
    if (viewEl) {
        experimentViewModal = new bootstrap.Modal(viewEl);
    }
    
    // Initialize acknowledgment checkboxes change handler
    document.querySelectorAll('.acknowledgment-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedAcknowledgments);
    });
    
    // Initialize add to queue button
    const addBtn = document.getElementById('addToQueueBtn');
    if (addBtn) addBtn.addEventListener('click', addSingleExperimentToQueue);
    
    // Initialize path validation button
    const validateBtn = document.getElementById('validatePathBtn');
    if (validateBtn) validateBtn.addEventListener('click', validateCurrentPath);
    
    // Real-time path validation
    const dataPathEl = document.getElementById('dataPath');
    if (dataPathEl) dataPathEl.addEventListener('input', debounceValidation);
}

// Open experiment modal for viewing or editing
function openExperimentModal(experimentId, mode = 'edit') {
    const modal = document.getElementById('experimentModal');
    const modalTitle = document.getElementById('experimentModalLabel');
    const form = document.getElementById('experimentForm');
    const addToQueueBtn = document.getElementById('addToQueueBtn');
    
    // Reset form
    form.reset();
    clearValidationMessage();
    
    // Prepare edit/queue modal
    currentEditingExperiment = experimentId;
    modalTitle.textContent = 'Experiment Details';
    addToQueueBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Add to Queue';
    addToQueueBtn.title = 'Add experiment to processing queue';
    
    // Load experiment data
    loadExperimentData(experimentId, mode);
    
    // Set defaults for queue processing
    document.getElementById('createDoi').checked = true;
    
    // Generate data path template for the current experiment
    ensureDataPathTemplate().then(() => {
        const currentDataPath = document.getElementById('dataPath').value;
        if (!currentDataPath || currentDataPath === 'Not set') {
            const runSelect = document.getElementById('runSelect');
            let runNumber = '';
            
            if (runSelect && runSelect.value) {
                const selectedOption = runSelect.options[runSelect.selectedIndex];
                if (selectedOption && selectedOption.text !== 'All') {
                    const runName = selectedOption.text;
                    runNumber = runName.includes('-') ? runName.split('-').pop() : runName;
                }
            }
            
            document.getElementById('dataPath').value = formatDataPath(dataPathTemplate, { runId: runNumber });
        }
    }).catch(() => {
        // Continue without template
    });
    
    experimentModal.show();
}

// Load experiment data into modal
function loadExperimentData(experimentId, mode = 'view') {
    const row = document.querySelector(`tr[data-experiment-id="${experimentId}"]`);
    if (!row) return;
    
    // Get data from the table row (new column order: Proposal, Experiment, Title)
    const proposal = row.querySelector('.experiment-proposal').textContent.trim();
    const experimentNumber = row.querySelector('.experiment-id').textContent.trim();
    // Get clean title without status badge
    const title = row.querySelector('.experiment-title-text').textContent.trim();
    const userFolder = row.getAttribute('data-user-folder') || '';
    
    // Populate form fields
    document.getElementById('experimentId').value = experimentId;
    document.getElementById('experimentTitle').value = title;
    document.getElementById('experimentNumber').value = experimentNumber;
    document.getElementById('proposalNumber').value = proposal !== 'N/A' ? proposal : '';
    
    // Set readonly/editable based on mode - title and proposal are always readonly
    const titleInput = document.getElementById('experimentTitle');
    const proposalInput = document.getElementById('proposalNumber');
    
    // Always keep title and proposal readonly
    titleInput.setAttribute('readonly', true);
    proposalInput.setAttribute('readonly', true);
    
    if (mode === 'edit') {
        // Load existing data path from the experiment if available
        if (userFolder && userFolder.trim() !== '') {
            // If there's already a data path, use it as-is
            document.getElementById('dataPath').value = userFolder;
        } else {
            // If there's no existing data path, generate one from the template
            applyDataPathPrefix('', experimentId).then(prefixedPath => {
                document.getElementById('dataPath').value = prefixedPath;
            }).catch(() => {
                // Fallback to empty if template generation fails
                document.getElementById('dataPath').value = '';
            });
        }
        
        // Keep DOI unchecked for editing existing experiments
        document.getElementById('createDoi').checked = false;
    } else {
        // Data path is for queue processing
        document.getElementById('dataPath').value = userFolder !== '' ? userFolder : '';
        
        // DOI setting defaults to checked for new queue processing
        document.getElementById('createDoi').checked = true;
    }
    
    // Reset acknowledgments and PVLogger path
    document.getElementById('pvLoggerPath').value = '';
    document.querySelectorAll('.acknowledgment-checkbox').forEach(cb => cb.checked = false);
    updateSelectedAcknowledgments();
}

// Add single experiment to queue from modal
function addSingleExperimentToQueue() {
    const form = document.getElementById('experimentForm');
    const formData = new FormData(form);
    const dataPath = formData.get('dataPath')?.trim();
    
    // Show loading state
    const addToQueueBtn = document.getElementById('addToQueueBtn');
    const originalButtonContent = addToQueueBtn.innerHTML;
    addToQueueBtn.disabled = true;
    
    // If no path provided, proceed directly (empty path is allowed)
    if (!dataPath || dataPath === '') {
        addToQueueBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Adding to Queue...';
        proceedWithAddToQueue(formData, addToQueueBtn, originalButtonContent);
        return;
    }
    
    // Path provided - validate it first
    addToQueueBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Validating...';
    
    validateDataPath(dataPath)
        .then(validationResult => {
            if (!validationResult.valid) {
                showNotification('error', `Invalid data path: ${validationResult.message}`);
                resetAddToQueueButton(addToQueueBtn, originalButtonContent);
                return;
            }
            
            // Path format is valid - proceed with adding to queue
            proceedWithAddToQueue(formData, addToQueueBtn, originalButtonContent);
        })
        .catch(error => {
            console.error('Path validation error:', error);
            showNotification('error', 'Unable to validate data path. Please check the path and try again.');
            resetAddToQueueButton(addToQueueBtn, originalButtonContent);
        });
}

// Helper function to reset the Add to Queue button
function resetAddToQueueButton(button, originalContent) {
    button.disabled = false;
    button.innerHTML = originalContent;
}

// Proceed with adding experiment to queue after validation
function proceedWithAddToQueue(formData, addToQueueBtn, originalButtonContent) {
    // Get selected acknowledgments
    const selectedAcks = Array.from(document.querySelectorAll('.acknowledgment-checkbox:checked'))
        .map(cb => cb.value);
    
    const experimentData = {
        experiment_id: currentEditingExperiment,
        experiment_number: formData.get('experimentNumber'),
        title: formData.get('title'),
        data_path: formData.get('dataPath') || null,
        pvlog_path: formData.get('pvLoggerPath') || null,
        doi: formData.get('createDoi') === 'on',
        proposal_number: formData.get('proposalNumber') || null,
        acknowledgments: selectedAcks
    };
    
    // Update button to show adding state
    addToQueueBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Adding to Queue...';
    
    // Add to queue via existing API
    fetch('/api/v1/create_update_queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: [experimentData] })
    })
    .then(response => response.json())
    .then(result => {
        if (result.failure === 0) {
            showNotification('success', 'Experiment added to queue successfully!');
            
            // Update the experiment's status badge in the table
            updateExperimentStatusBadge(currentEditingExperiment, 'Pending');
            
            // Reset button before hiding modal
            resetAddToQueueButton(addToQueueBtn, originalButtonContent);
            experimentModal.hide();
        } else {
            showNotification('warning', 'Failed to add experiment to queue.');
            resetAddToQueueButton(addToQueueBtn, originalButtonContent);
        }
    })
    .catch(error => {
        console.error('Error adding experiment to queue:', error);
        showNotification('error', 'Failed to add experiment to queue. Please try again.');
        resetAddToQueueButton(addToQueueBtn, originalButtonContent);
    });
}

// Update selected acknowledgments display
function updateSelectedAcknowledgments() {
    const selectedCheckboxes = document.querySelectorAll('.acknowledgment-checkbox:checked');
    const selectedText = document.getElementById('selectedAcknowledgmentsText');
    const hiddenInput = document.getElementById('selectedAcknowledgments');
    
    if (selectedCheckboxes.length === 0) {
        selectedText.textContent = 'No acknowledgments selected';
        selectedText.className = 'text-muted';
        hiddenInput.value = '';
    } else {
        const titles = Array.from(selectedCheckboxes).map(cb => 
            cb.nextElementSibling.textContent.trim()
        );
        selectedText.textContent = `${selectedCheckboxes.length} acknowledgment(s) selected: ${titles.join(', ')}`;
        selectedText.className = 'text-primary';
        
        const ids = Array.from(selectedCheckboxes).map(cb => cb.value);
        hiddenInput.value = JSON.stringify(ids);
    }
}

// Open read-only view modal
function openExperimentViewModal(experimentId) {
    const row = document.querySelector(`tr[data-experiment-id="${experimentId}"]`);
    if (!row) return;

    try {
        // Get full experiment data from the data attribute
        const experimentDataStr = row.getAttribute('data-experiment-data');
        if (experimentDataStr) {
            const experiment = JSON.parse(experimentDataStr);
            populateViewModalFull(experiment);
        } else {
            // Fallback to basic data from DOM
            const proposal = row.querySelector('.experiment-proposal')?.textContent.trim() || '';
            const experimentNumber = row.querySelector('.experiment-id')?.textContent.trim() || '';
            const title = row.querySelector('.experiment-title-text')?.textContent.trim() || '';
            const statusBadge = row.querySelector('.status-badge');
            populateViewModalBasic(title, experimentNumber, proposal, statusBadge);
        }
    } catch (error) {
        console.error('Error parsing experiment data:', error);
        // Fallback to basic data from DOM
        const proposal = row.querySelector('.experiment-proposal')?.textContent.trim() || '';
        const experimentNumber = row.querySelector('.experiment-id')?.textContent.trim() || '';
        const title = row.querySelector('.experiment-title-text')?.textContent.trim() || '';
        const statusBadge = row.querySelector('.status-badge');
        populateViewModalBasic(title, experimentNumber, proposal, statusBadge);
    }

    if (!experimentViewModal) {
        const viewEl = document.getElementById('experimentViewModal');
        if (viewEl) experimentViewModal = new bootstrap.Modal(viewEl);
    }
    if (experimentViewModal) experimentViewModal.show();
}

// Populate view modal with basic information (fallback)
function populateViewModalBasic(title, experimentNumber, proposal, statusBadge) {
    const titleEl = document.getElementById('detailViewTitle');
    const esafEl = document.getElementById('detailViewExperimentNumber');
    const proposalEl = document.getElementById('detailViewProposal');
    const statusEl = document.getElementById('detailViewStatus');
    const beamlineEl = document.getElementById('detailViewBeamline');
    const descriptionEl = document.getElementById('detailViewDescription');
    const startDateEl = document.getElementById('detailViewStartDate');
    const endDateEl = document.getElementById('detailViewEndDate');
    const spokespersonEl = document.getElementById('detailViewSpokesperson');
    const beamlineContactEl = document.getElementById('detailViewBeamlineContact');
    const doiEl = document.getElementById('detailViewDoi');
    const esafPdfEl = document.getElementById('detailViewEsafPdf');

    if (titleEl) titleEl.textContent = title || 'N/A';
    if (esafEl) esafEl.textContent = experimentNumber || 'N/A';
    if (proposalEl) proposalEl.textContent = proposal || 'N/A';
    if (statusEl) {
        statusEl.innerHTML = '';
        if (statusBadge) {
            const clone = statusBadge.cloneNode(true);
            statusEl.appendChild(clone);
        } else {
            statusEl.textContent = 'N/A';
        }
    }
    
    // Set other fields to N/A for now
    if (beamlineEl) beamlineEl.textContent = 'N/A';
    if (descriptionEl) descriptionEl.textContent = 'N/A';
    if (startDateEl) startDateEl.textContent = 'N/A';
    if (endDateEl) endDateEl.textContent = 'N/A';
    if (spokespersonEl) spokespersonEl.textContent = 'N/A';
    if (beamlineContactEl) beamlineContactEl.textContent = 'N/A';
    if (doiEl) doiEl.textContent = 'N/A';
    if (esafPdfEl) esafPdfEl.textContent = 'N/A';
}

// Populate view modal with full experiment data
function populateViewModalFull(experiment) {
    const titleEl = document.getElementById('detailViewTitle');
    const esafEl = document.getElementById('detailViewExperimentNumber');
    const proposalEl = document.getElementById('detailViewProposal');
    const statusEl = document.getElementById('detailViewStatus');
    const beamlineEl = document.getElementById('detailViewBeamline');
    const descriptionEl = document.getElementById('detailViewDescription');
    const startDateEl = document.getElementById('detailViewStartDate');
    const endDateEl = document.getElementById('detailViewEndDate');
    const spokespersonEl = document.getElementById('detailViewSpokesperson');
    const beamlineContactEl = document.getElementById('detailViewBeamlineContact');
    const doiEl = document.getElementById('detailViewDoi');
    const esafPdfEl = document.getElementById('detailViewEsafPdf');

    if (titleEl) titleEl.textContent = experiment.title || 'N/A';
    if (esafEl) esafEl.textContent = experiment.id || 'N/A';
    if (proposalEl) proposalEl.textContent = experiment.proposal || 'N/A';
    
    // Status badge
    if (statusEl) {
        statusEl.innerHTML = '';
        if (experiment.process_status) {
            const badge = document.createElement('span');
            badge.className = `status-badge status-${experiment.process_status.toLowerCase().replace(/\s+/g, '-')}`;
            badge.textContent = experiment.process_status;
            statusEl.appendChild(badge);
        } else {
            statusEl.textContent = 'N/A';
        }
    }
    
    if (beamlineEl) beamlineEl.textContent = experiment.beamline_name || 'N/A';
    if (descriptionEl) descriptionEl.textContent = experiment.description || 'N/A';
    
    // Format dates
    if (startDateEl) {
        startDateEl.textContent = experiment.start_date ? 
            new Date(experiment.start_date).toLocaleDateString() : 'N/A';
    }
    if (endDateEl) {
        endDateEl.textContent = experiment.end_date ? 
            new Date(experiment.end_date).toLocaleDateString() : 'N/A';
    }
    
    // Personnel with email links
    if (spokespersonEl) {
        if (experiment.spokesperson_name && experiment.spokesperson_name !== 'N/A') {
            let spokespersonText = experiment.spokesperson_name;
            if (experiment.spokesperson_email && experiment.spokesperson_email !== 'N/A') {
                spokespersonEl.innerHTML = `${spokespersonText} <br><small><a href="mailto:${experiment.spokesperson_email}">${experiment.spokesperson_email}</a></small>`;
            } else {
                spokespersonEl.textContent = spokespersonText;
            }
        } else {
            spokespersonEl.textContent = 'N/A';
        }
    }
    
    if (beamlineContactEl) {
        if (experiment.beamline_contact_name && experiment.beamline_contact_name !== 'N/A') {
            let contactText = experiment.beamline_contact_name;
            if (experiment.beamline_contact_email && experiment.beamline_contact_email !== 'N/A') {
                beamlineContactEl.innerHTML = `${contactText} <br><small><a href="mailto:${experiment.beamline_contact_email}">${experiment.beamline_contact_email}</a></small>`;
            } else {
                beamlineContactEl.textContent = contactText;
            }
        } else {
            beamlineContactEl.textContent = 'N/A';
        }
    }
    
    // DOI with link
    if (doiEl) {
        if (experiment.sees_doi && experiment.sees_doi !== 'N/A') {
            doiEl.innerHTML = `<a href="https://doi.org/${experiment.sees_doi}" target="_blank">${experiment.sees_doi}</a>`;
        } else {
            doiEl.textContent = 'N/A';
        }
    }
    
    // ESAF PDF with link
    if (esafPdfEl) {
        if (experiment.esaf_pdf_file && experiment.esaf_pdf_file !== 'N/A') {
            esafPdfEl.innerHTML = `<a href="${experiment.esaf_pdf_file}" target="_blank">View PDF</a>`;
        } else {
            esafPdfEl.textContent = 'N/A';
        }
    }
}

// Initialize table event handlers
function initializeTableHandlers() {
    const tableBody = document.getElementById('experimentsTableBody');
    if (!tableBody) return;
    
    // Handle view and edit button clicks
    tableBody.addEventListener('click', (event) => {
        if (event.target.closest('.btn-view')) {
            const experimentId = event.target.closest('.btn-view').getAttribute('data-experiment-id');
            openExperimentViewModal(experimentId);
        } else if (event.target.closest('.btn-edit')) {
            const experimentId = event.target.closest('.btn-edit').getAttribute('data-experiment-id');
            openExperimentModal(experimentId, 'edit');
        }
    });
    
    // No bulk selection or processing for now
}

// Fetch acknowledgment options from the server
function fetchAcknowledgmentOptions() {
    fetch('/api/v1/get_acknowledgments')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch acknowledgments');
            }
            return response.json();
        })
        .then(data => {
            acknowledgmentOptions = data;
            // Acknowledgments are already rendered in the template
        })
        .catch(error => console.error('Error fetching acknowledgment options:', error));
}

// Path validation with debouncing
let validationTimeout = null;

function debounceValidation() {
    clearTimeout(validationTimeout);
    validationTimeout = setTimeout(validateCurrentPath, 500);
}

function validateCurrentPath() {
    const pathInput = document.getElementById('dataPath');
    const path = pathInput.value.trim();
    
    if (!path) {
        clearValidationMessage();
        return;
    }
    
    updateValidationMessage('muted', 'Validating...');
    
    validateDataPath(path)
        .then(result => {
            if (result.valid === false) {
                updateValidationMessage('danger', result.message);
            } else if (result.exists === true) {
                updateValidationMessage('warning', result.message);
            } else if (result.exists === false) {
                updateValidationMessage('success', result.message);
            }
        })
        .catch(error => {
            console.error('Validation error:', error);
            updateValidationMessage('danger', 'Validation failed');
        });
}

function updateValidationMessage(type, message) {
    const messageEl = document.getElementById('pathValidationMessage');
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.className = `small text-${type}`;
}

function clearValidationMessage() {
    const messageEl = document.getElementById('pathValidationMessage');
    if (messageEl) {
        messageEl.textContent = '';
        messageEl.className = 'small';
    }
}

// Function to validate if a data path exists
function validateDataPath(path) {
    if (!path || !path.trim()) {
        return Promise.resolve({ exists: false, valid: false, message: 'Please enter a path' });
    }

    return fetch('/api/v1/validate_data_path', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: path.trim() })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
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
    })
    .catch(error => {
        console.error('Error validating path:', error);
        return {
            exists: null,
            valid: false,
            message: 'Unable to validate path'
        };
    });
}

// Function to ensure we have the current data path template
function ensureDataPathTemplate() {
    const stationSelect = document.getElementById('stationSelect');
    const techniqueSelect = document.getElementById('techniqueSelect');
    
    if (!stationSelect || !techniqueSelect) {
        return Promise.reject('Station or technique select not found');
    }
    
    const stationId = stationSelect.value;
    const techniqueId = techniqueSelect.value;
    
    if (!stationId || !techniqueId) {
        return Promise.reject('Station or technique not selected');
    }
    
    return fetchDataPathTemplate(stationId, techniqueId);
}

// Function to fetch and store the data path template
function fetchDataPathTemplate(stationId, techniqueId) {
    if (!stationId || !techniqueId) return Promise.reject('Missing required parameters');

    console.log(`Fetching data path for station: ${stationId}, technique: ${techniqueId}`);
    return fetch(`/api/v1/get_data_path?station_id=${stationId}&technique_id=${techniqueId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            return response.text();
        })
        .then(template => {
            console.log(`Received template: "${template}"`);
            dataPathTemplate = template;
            return template;
        });
}

// Format data path based on template and experiment data
function formatDataPath(template, experimentData = {}) {
    if (!template) return '';

    const currentYear = new Date().getFullYear();
    const runId = experimentData.runId || '';

    return template
        .replace(/{YEAR}/g, currentYear)
        .replace(/{RUN}/g, runId);
}

// Apply data path prefix based on station and technique
function applyDataPathPrefix(originalPath, experimentId) {
    return new Promise((resolve, reject) => {
        const stationSelect = document.getElementById('stationSelect');
        const techniqueSelect = document.getElementById('techniqueSelect');
        const runSelect = document.getElementById('runSelect');
        
        // Check if we have station and technique selected
        if (!stationSelect || !techniqueSelect || !stationSelect.value || !techniqueSelect.value) {
            console.log('Station or technique not selected, using original path');
            resolve(originalPath);
            return;
        }
        
        const stationId = stationSelect.value;
        const techniqueId = techniqueSelect.value;
        
        // Get run number for template variable replacement
        let runNumber = '';
        if (runSelect && runSelect.value) {
            const selectedOption = runSelect.options[runSelect.selectedIndex];
            if (selectedOption && selectedOption.text !== 'All') {
                const runName = selectedOption.text;
                runNumber = runName.includes('-') ? runName.split('-').pop() : runName;
            }
        }
        
        // Fetch the data path template
        fetchDataPathTemplate(stationId, techniqueId)
            .then(template => {
                if (!template || template.trim() === '') {
                    console.log('No template found, using original path');
                    resolve(originalPath);
                    return;
                }
                
                // Format the template with current year and run
                const formattedPrefix = formatDataPath(template, { runId: runNumber });
                
                // Combine prefix with original path
                // If originalPath starts with the formattedPrefix, don't duplicate it
                if (originalPath.startsWith(formattedPrefix)) {
                    resolve(originalPath);
                } else {
                    // Add a separator if needed
                    const separator = formattedPrefix.endsWith('/') || formattedPrefix.endsWith('\\') || originalPath.startsWith('/') || originalPath.startsWith('\\') ? '' : '/';
                    const combinedPath = formattedPrefix + separator + originalPath;
                    resolve(combinedPath);
                }
            })
            .catch(error => {
                console.log('Failed to fetch template:', error);
                reject(error);
            });
    });
}

// Search functionality
let searchTimeout = null;

function initializeSearchFunctionality() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    // Real-time search with debouncing
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performClientSideSearch(searchInput.value);
        }, 300);
    });
    
    // Initial search if there's a value
    if (searchInput.value.trim()) {
        performClientSideSearch(searchInput.value);
    }
}

function performClientSideSearch(searchTerm) {
    const tableBody = document.getElementById('experimentsTableBody');
    const rows = tableBody.querySelectorAll('.experiment-row');
    const term = searchTerm.toLowerCase().trim();
    
    rows.forEach(row => {
        if (!term) {
            row.style.display = '';
            return;
        }
        
        // Search across proposal, experiment ID, and title
        const proposal = row.querySelector('.experiment-proposal').textContent.toLowerCase();
        const experimentId = row.querySelector('.experiment-id').textContent.toLowerCase();
        const title = row.querySelector('.experiment-title').textContent.toLowerCase();
        
        const matches = proposal.includes(term) || 
                       experimentId.includes(term) || 
                       title.includes(term);
        
        row.style.display = matches ? '' : 'none';
    });
}

// Auto-submit filter form on dropdown change
function initializeFilterFormAutoSubmit() {
    const filterForm = document.getElementById('filterForm');
    const stationSelect = document.getElementById('stationSelect');
    const techniqueSelect = document.getElementById('techniqueSelect');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    
    if (filterForm) {
        const selects = filterForm.querySelectorAll('select');
        selects.forEach(select => {
            select.addEventListener('change', () => {
                filterForm.submit();
            });
        });
    }
    
    // Clear filters functionality
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (filterForm) {
                const selects = filterForm.querySelectorAll('select');
                const searchInput = document.getElementById('searchInput');
                
                selects.forEach(select => {
                    select.value = '';
                });
                
                if (searchInput) {
                    searchInput.value = '';
                    // Trigger search to show all rows
                    performClientSideSearch('');
                }
                
                filterForm.submit();
            }
        });
    }
    
    // Listen for station/technique changes to update data path template
    if (stationSelect && techniqueSelect) {
        const handleTemplateUpdate = () => {
            const stationId = stationSelect.value;
            const techniqueId = techniqueSelect.value;
            
            if (stationId && techniqueId) {
                fetchDataPathTemplate(stationId, techniqueId)
                    .catch(error => {
                        console.log('Could not fetch data path template:', error);
                    });
            }
        };
        
        stationSelect.addEventListener('change', handleTemplateUpdate);
        techniqueSelect.addEventListener('change', handleTemplateUpdate);
        
        // Initial load if both are already selected
        if (stationSelect.value && techniqueSelect.value) {
            handleTemplateUpdate();
        }
    }
}

// Sorting functionality
function initializeSortHandlers() {
    const sortableHeaders = document.querySelectorAll('.sortable-header');

    sortableHeaders.forEach(header => {
        const column = header.dataset.column;
        
        header.addEventListener('click', () => {
            // Determine next sort direction
            const currentSort = currentSortState.find(s => s.column === column);
            let nextDirection = 'asc';
            
            if (currentSort) {
                nextDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
            }
            
            updateSortState(column, nextDirection);
            updateSortUI();
            sortTableByState('experimentsTableBody');
        });
    });
}

function updateSortState(column, direction) {
    // Clear all previous sorts - only show one column sorted at a time
    currentSortState = [{ column, direction }];
}

function updateSortUI() {
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

function sortTableByState(tableId) {
    const tableBody = document.getElementById(tableId);
    if (!tableBody) return;
    
    const rows = Array.from(tableBody.querySelectorAll('tr'));

    rows.sort((a, b) => {
        for (const { column, direction } of currentSortState) {
            const aVal = getCellValue(a, column);
            const bVal = getCellValue(b, column);

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    tableBody.innerHTML = '';
    rows.forEach(row => tableBody.appendChild(row));
}

function getCellValue(row, column) {
    switch (column) {
        case 'proposal':
            return row.querySelector('.experiment-proposal')?.textContent.trim() || '';
        case 'experiment':
            return row.querySelector('.experiment-id')?.textContent.trim() || '';
        case 'title':
            return row.querySelector('.experiment-title-text')?.textContent.trim().toLowerCase() || '';
        case 'status':
            return row.querySelector('.status-badge')?.textContent.trim().toLowerCase() || '';
        default: 
            return '';
    }
}

// Update experiment status badge in the table
function updateExperimentStatusBadge(experimentId, newStatus) {
    const row = document.querySelector(`tr[data-experiment-id="${experimentId}"]`);
    if (!row) {
        console.warn(`Could not find table row for experiment ${experimentId}`);
        return;
    }
    
    const statusBadge = row.querySelector('.status-badge');
    if (!statusBadge) {
        console.warn(`Could not find status badge for experiment ${experimentId}`);
        return;
    }
    
    // Update the badge text and CSS class
    statusBadge.textContent = newStatus;
    
    // Remove existing status-* classes but keep the base 'status-badge' class
    const classList = statusBadge.className.split(' ');
    const filteredClasses = classList.filter(cls => !cls.startsWith('status-') || cls === 'status-badge');
    
    // Add new status class
    const statusClass = `status-${newStatus.toLowerCase().replace(/\s+/g, '-')}`;
    filteredClasses.push(statusClass);
    
    // Apply the updated class list
    statusBadge.className = filteredClasses.join(' ');
    
    // Add a subtle animation to indicate the change
    statusBadge.style.transition = 'all 0.3s ease';
    statusBadge.style.transform = 'scale(1.1)';
    
    setTimeout(() => {
        statusBadge.style.transform = 'scale(1)';
    }, 300);
    
    console.log(`Updated status badge for experiment ${experimentId} to "${newStatus}"`);
}

// Show notification using Bootstrap toast
function showNotification(type, message) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1055';
        document.body.appendChild(toastContainer);
    }

    // Create unique toast ID
    const toastId = 'toast-' + Date.now();
    
    // Map types to Bootstrap classes and icons
    const typeConfig = {
        'success': { class: 'text-bg-success', icon: 'bi-check-circle-fill' },
        'error': { class: 'text-bg-danger', icon: 'bi-exclamation-triangle-fill' },
        'warning': { class: 'text-bg-warning', icon: 'bi-exclamation-triangle-fill' },
        'info': { class: 'text-bg-info', icon: 'bi-info-circle-fill' }
    };
    
    const config = typeConfig[type] || typeConfig['info'];
    
    // Create toast HTML
    const toastHTML = `
        <div id="${toastId}" class="toast ${config.class}" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="4000">
            <div class="toast-header ${config.class}">
                <i class="bi ${config.icon} me-2"></i>
                <strong class="me-auto text-capitalize">${type}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    // Add toast to container
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    // Initialize and show toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    // Remove toast from DOM after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    fetchAcknowledgmentOptions();
    initializeExperimentModal();
    initializeTableHandlers();
    initializeFilterFormAutoSubmit();
    initializeSortHandlers();
    initializeSearchFunctionality();
    updateBulkActionButtons();
});
