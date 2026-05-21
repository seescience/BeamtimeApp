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
let currentSortState = [];
let experimentModal = null;
let experimentViewModal = null;
let currentEditingExperiment = null;

// Initialize data path template dropdown
function initializeDataPathTemplates() {
    const dropdown = document.getElementById('dataPathTemplates');
    const dropdownBtn = document.getElementById('dataPathDropdownBtn');
    
    if (!dropdown || !dropdownBtn) return;
    
    // Toggle dropdown visibility
    dropdownBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
    });
    
    // Handle dropdown item clicks
    dropdown.addEventListener('click', (event) => {
        if (event.target.classList.contains('dropdown-item')) {
            event.preventDefault();
            
            const template = event.target.getAttribute('data-template');
            
            if (template) {
                const populatedPath = populateDataPathTemplate(template);
                document.getElementById('dataPath').value = populatedPath;
                
                // Hide dropdown
                dropdown.style.display = 'none';
                
                // Trigger validation
                debounceValidation();
            }
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target) && !dropdownBtn.contains(event.target)) {
            dropdown.style.display = 'none';
        }
    });
}

// Populate dropdown with resolved paths for the current experiment
function populateDataPathDropdown(experimentId) {
    const dropdown = document.getElementById('dataPathTemplates');
    if (!dropdown) return;
    
    // Get experiment data
    let year = new Date().getFullYear();
    let runNumber = '';
    let userLastName = 'user';
    
    if (experimentId) {
        const row = document.querySelector(`tr[data-experiment-id="${experimentId}"]`);
        if (row) {
            const experimentDataStr = row.getAttribute('data-experiment-data');
            if (experimentDataStr) {
                try {
                    const experiment = JSON.parse(experimentDataStr);
                    
                    if (experiment.start_date) {
                        year = new Date(experiment.start_date).getFullYear();
                    }
                    
                    if (experiment.run_id) {
                        const runSelect = document.getElementById('runSelect');
                        const runOption = runSelect ? runSelect.querySelector(`option[value="${experiment.run_id}"]`) : null;
                        runNumber = runOption ? runOption.textContent.trim() : experiment.run_id;
                    }
                    
                    if (experiment.spokesperson_name && experiment.spokesperson_name !== 'N/A') {
                        const nameParts = experiment.spokesperson_name.split(' ');
                        if (nameParts.length > 1) {
                            userLastName = nameParts[nameParts.length - 1].toLowerCase();
                        }
                    }
                } catch (error) {
                    console.warn('Could not parse experiment data:', error);
                }
            }
        }
    }
    
    // Check if a technique is selected in the filters
    const techniqueSelect = document.getElementById('techniqueSelect');
    const selectedTechniqueId = techniqueSelect ? techniqueSelect.value : null;
    
    // Get all technique templates and populate them
    const templates = [];
    const originalItems = dropdown.querySelectorAll('[data-template]');
    
    originalItems.forEach(item => {
        const template = item.getAttribute('data-template');
        const techniqueUser = item.getAttribute('data-user');
        
        if (template) {
            // If a technique is selected in filters, only show paths for that technique's user
            if (selectedTechniqueId) {
                // Find the selected technique's user_name
                const selectedTechniqueOption = techniqueSelect.querySelector(`option[value="${selectedTechniqueId}"]`);
                if (selectedTechniqueOption) {
                    const selectedTechniqueUser = selectedTechniqueOption.getAttribute('data-user');
                    // Skip this template if it doesn't match the selected technique's user
                    if (techniqueUser && selectedTechniqueUser && techniqueUser !== selectedTechniqueUser) {
                        return;
                    }
                }
            }
            
            const resolvedPath = template
                .replace(/{year}/g, year)
                .replace(/{run}/g, runNumber)
                .replace(/{user}/g, userLastName);
            
            templates.push({ template, resolvedPath });
        }
    });
    
    // Clear and rebuild dropdown with resolved paths
    dropdown.innerHTML = '';
    templates.forEach(({ template, resolvedPath }) => {
        const item = document.createElement('a');
        item.className = 'dropdown-item';
        item.href = '#';
        item.setAttribute('data-template', template);
        item.textContent = resolvedPath;
        dropdown.appendChild(item);
    });
}

// Get the base_dir path for the currently selected technique in filters
function getSelectedTechniqueBasePath() {
    const techniqueSelect = document.getElementById('techniqueSelect');
    if (!techniqueSelect || !techniqueSelect.value) {
        return null; // No technique selected
    }
    
    const selectedTechniqueId = techniqueSelect.value;
    const selectedOption = techniqueSelect.querySelector(`option[value="${selectedTechniqueId}"]`);
    const selectedTechniqueUser = selectedOption ? selectedOption.getAttribute('data-user') : null;
    
    if (!selectedTechniqueUser) {
        return null; // No user data available
    }
    
    // Find the base_dir template for this technique's user from the dropdown
    const dropdown = document.getElementById('dataPathTemplates');
    if (!dropdown) return null;
    
    const templateItems = dropdown.querySelectorAll('[data-template][data-user]');
    for (const item of templateItems) {
        const techniqueUser = item.getAttribute('data-user');
        const template = item.getAttribute('data-template');
        
        if (techniqueUser === selectedTechniqueUser && template) {
            return template;
        }
    }
    
    return null; // No matching template found
}

// Populate data path template with current values
function populateDataPathTemplate(template) {
    let year = new Date().getFullYear();
    let runNumber = '';
    let userLastName = 'user';
    
    // Get all data from the selected experiment
    if (currentEditingExperiment) {
        const row = document.querySelector(`tr[data-experiment-id="${currentEditingExperiment}"]`);
        if (row) {
            // Get experiment data from the data attribute
            const experimentDataStr = row.getAttribute('data-experiment-data');
            if (experimentDataStr) {
                try {
                    const experiment = JSON.parse(experimentDataStr);
                    
                    // Extract year from start_date or end_date
                    if (experiment.start_date) {
                        year = new Date(experiment.start_date).getFullYear();
                    }
                    
                    if (experiment.run_id) {
                        const runSelect = document.getElementById('runSelect');
                        const runOption = runSelect ? runSelect.querySelector(`option[value="${experiment.run_id}"]`) : null;
                        runNumber = runOption ? runOption.textContent.trim() : experiment.run_id;
                    }
                    
                    // Get spokesperson last name
                    if (experiment.spokesperson_name && experiment.spokesperson_name !== 'N/A') {
                        const nameParts = experiment.spokesperson_name.split(' ');
                        if (nameParts.length > 1) {
                            userLastName = nameParts[nameParts.length - 1].toLowerCase();
                        }
                    }
                } catch (error) {
                    console.warn('Could not parse experiment data:', error);
                }
            }
            
            // Fallback to DOM elements if JSON data not available
            if (!experimentDataStr) {
                const spokespersonCell = row.querySelector('.experiment-spokesperson');
                if (spokespersonCell) {
                    const spokespersonName = spokespersonCell.textContent.trim();
                    if (spokespersonName && spokespersonName !== 'N/A') {
                        const nameParts = spokespersonName.split(' ');
                        if (nameParts.length > 1) {
                            userLastName = nameParts[nameParts.length - 1].toLowerCase();
                        }
                    }
                }
            }
        }
    }
    
    // Replace template variables
    return template
        .replace(/{year}/g, year)
        .replace(/{run}/g, runNumber)
        .replace(/{user}/g, userLastName);
}

// Initialize DOI checkbox interactions
function initializeDoiCheckboxes() {
    const createDoiCheckbox = document.getElementById('createDoi');
    const draftDoiContainer = document.getElementById('draftDoiContainer');
    const draftDoiCheckbox = document.getElementById('draftDoi');
    
    if (!createDoiCheckbox || !draftDoiContainer || !draftDoiCheckbox) return;
    
    // Function to toggle draft DOI visibility
    function toggleDraftDoiVisibility() {
        if (createDoiCheckbox.checked) {
            draftDoiContainer.classList.remove('d-none');
            draftDoiCheckbox.disabled = false;
        } else {
            draftDoiContainer.classList.add('d-none');
            draftDoiCheckbox.checked = false;
            draftDoiCheckbox.disabled = true;
        }
    }
    
    // Set initial state
    toggleDraftDoiVisibility();
    
    // Listen for changes to create DOI checkbox
    createDoiCheckbox.addEventListener('change', toggleDraftDoiVisibility);
}

// Fetch and populate pvlog template dropdown
function loadPVLoggerTemplates() {
    const select = document.getElementById('pvLoggerTemplateSelect');
    if (!select) return;

    fetch('/api/v1/get_pvlog_templates')
        .then(response => response.json())
        .then(templates => {
            select.innerHTML = '<option value="">Select a template...</option>';
            templates.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.path;
                opt.textContent = t.label;
                select.appendChild(opt);
            });
        })
        .catch(() => {
            select.innerHTML = '<option value="">No templates available</option>';
        });
}

// Initialize PVLogger file picker
function initializePVLoggerFilePicker() {
    const fileInput = document.getElementById('pvLoggerPath');
    const selectBtn = document.getElementById('selectFileBtn');
    const clearBtn = document.getElementById('clearFileBtn');
    const hiddenInput = document.getElementById('pvLoggerPathValue');
    const templateSelect = document.getElementById('pvLoggerTemplateSelect');

    if (!fileInput || !selectBtn || !hiddenInput || !templateSelect) return;

    // When template dropdown changes, set the hidden value and clear any upload
    templateSelect.addEventListener('change', () => {
        hiddenInput.value = templateSelect.value;
        clearUploadedFile();
    });

    // Handle upload button click
    selectBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle clear upload button
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearFileSelection();
        });
    }

    // Handle file selection
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const fileName = file.name.toLowerCase();
            if (!fileName.endsWith('.yaml') && !fileName.endsWith('.yml')) {
                showNotification('error', 'Please select a YAML file (.yaml or .yml)');
                fileInput.value = '';
                return;
            }
            uploadPVLoggerFile(file);
        }
    });
}

// Upload PVLogger file
function uploadPVLoggerFile(file) {
    const uploadedLabel = document.getElementById('pvLoggerUploadedLabel');
    const uploadedName = document.getElementById('pvLoggerUploadedName');
    const hiddenInput = document.getElementById('pvLoggerPathValue');
    const selectBtn = document.getElementById('selectFileBtn');
    const templateSelect = document.getElementById('pvLoggerTemplateSelect');
    const esafNumber = document.getElementById('experimentNumber').value;

    if (!esafNumber) {
        showNotification('error', 'ESAF number is required for file upload');
        return;
    }

    selectBtn.disabled = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('esaf_number', esafNumber);

    fetch('/api/v1/upload_pvlogger_file', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            hiddenInput.value = result.path;
            if (templateSelect) templateSelect.value = '';
            if (uploadedName) uploadedName.textContent = result.filename;
            if (uploadedLabel) uploadedLabel.style.display = 'block';
            showNotification('success', result.message);
        } else {
            showNotification('error', result.error || 'Upload failed');
            clearFileSelection();
        }
    })
    .catch(error => {
        console.error('Upload error:', error);
        showNotification('error', 'Upload failed. Please try again.');
        clearFileSelection();
    })
    .finally(() => {
        selectBtn.disabled = false;
    });
}

// Clear uploaded file (keep template dropdown intact)
function clearUploadedFile() {
    const fileInput = document.getElementById('pvLoggerPath');
    const uploadedLabel = document.getElementById('pvLoggerUploadedLabel');
    const uploadedName = document.getElementById('pvLoggerUploadedName');

    if (fileInput) fileInput.value = '';
    if (uploadedLabel) uploadedLabel.style.display = 'none';
    if (uploadedName) uploadedName.textContent = '';
}

// Clear file selection and reset hidden value
function clearFileSelection() {
    const hiddenInput = document.getElementById('pvLoggerPathValue');
    const templateSelect = document.getElementById('pvLoggerTemplateSelect');
    const selectBtn = document.getElementById('selectFileBtn');

    clearUploadedFile();
    if (hiddenInput) hiddenInput.value = '';
    if (templateSelect) templateSelect.value = '';
    if (selectBtn) selectBtn.disabled = false;
}

// Reset PVLogger section on modal close
function resetPVLoggerFilePicker() {
    const templateSelect = document.getElementById('pvLoggerTemplateSelect');
    const hiddenInput = document.getElementById('pvLoggerPathValue');

    clearUploadedFile();
    if (templateSelect) templateSelect.value = '';
    if (hiddenInput) hiddenInput.value = '';
}

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
    
    // Initialize file picker for PVLogger Path
    initializePVLoggerFilePicker();
    loadPVLoggerTemplates();
    
    // Initialize DOI checkbox interactions
    initializeDoiCheckboxes();
    
    // Initialize data path template dropdown
    initializeDataPathTemplates();
    
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
    
    // Populate dropdown with resolved paths for this experiment
    populateDataPathDropdown(experimentId);
    
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
            // Check if a technique is selected in the filters and prepopulate with its base_dir
            const prepopulatedPath = getSelectedTechniqueBasePath();
            if (prepopulatedPath) {
                const populatedPath = populateDataPathTemplate(prepopulatedPath);
                document.getElementById('dataPath').value = populatedPath;
            } else {
                document.getElementById('dataPath').value = '';
            }
        }
        
        // Keep DOI unchecked for editing existing experiments
        document.getElementById('createDoi').checked = false;
    } else {
        // Data path is for queue processing
        if (userFolder && userFolder.trim() !== '') {
            document.getElementById('dataPath').value = userFolder;
        } else {
            // Check if a technique is selected in the filters and prepopulate with its base_dir
            const prepopulatedPath = getSelectedTechniqueBasePath();
            if (prepopulatedPath) {
                const populatedPath = populateDataPathTemplate(prepopulatedPath);
                document.getElementById('dataPath').value = populatedPath;
            } else {
                document.getElementById('dataPath').value = '';
            }
        }
        
        // DOI setting defaults to checked for new queue processing
        document.getElementById('createDoi').checked = true;
    }
    
    // Reset acknowledgments and PVLogger path
    resetPVLoggerFilePicker();
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
        pvlog_path: formData.get('pvLoggerPathValue') || null,
        doi: formData.get('createDoi') === 'on',
        draft_doi: formData.get('draftDoi') === 'on',
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
            const dataPath = row.getAttribute('data-user-folder') || '';
            populateViewModalBasic(title, experimentNumber, proposal, statusBadge, dataPath);
        }
    } catch (error) {
        console.error('Error parsing experiment data:', error);
        // Fallback to basic data from DOM
        const proposal = row.querySelector('.experiment-proposal')?.textContent.trim() || '';
        const experimentNumber = row.querySelector('.experiment-id')?.textContent.trim() || '';
        const title = row.querySelector('.experiment-title-text')?.textContent.trim() || '';
        const statusBadge = row.querySelector('.status-badge');
        const dataPath = row.getAttribute('data-user-folder') || '';
        populateViewModalBasic(title, experimentNumber, proposal, statusBadge, dataPath);
    }

    if (!experimentViewModal) {
        const viewEl = document.getElementById('experimentViewModal');
        if (viewEl) experimentViewModal = new bootstrap.Modal(viewEl);
    }
    if (experimentViewModal) experimentViewModal.show();
}

// Populate view modal with basic information (fallback)
function populateViewModalBasic(title, experimentNumber, proposal, statusBadge, dataPath) {
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
    
    // Set data path from experiment data or N/A
    if (dataPathEl) {
        dataPathEl.textContent = (dataPath && dataPath.trim() !== '') ? dataPath : 'N/A';
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
    const dataPathEl = document.getElementById('detailViewDataPath');
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
    if (dataPathEl) {
        dataPathEl.textContent = (experiment.folder && experiment.folder.trim() !== '') ? experiment.folder : 'N/A';
    }
    
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
        
        // Search across proposal, experiment ID, spokesperson, and title
        const proposal = row.querySelector('.experiment-proposal').textContent.toLowerCase();
        const experimentId = row.querySelector('.experiment-id').textContent.toLowerCase();
        const spokesperson = row.querySelector('.experiment-spokesperson').textContent.toLowerCase();
        const title = row.querySelector('.experiment-title').textContent.toLowerCase();
        
        const matches = proposal.includes(term) || 
                       experimentId.includes(term) || 
                       spokesperson.includes(term) || 
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
                // If this is the technique select, update the data path dropdown if modal is open
                if (select === techniqueSelect && currentEditingExperiment) {
                    populateDataPathDropdown(currentEditingExperiment);
                    
                    // Also update the data path field with the new technique's base_dir
                    const dataPathInput = document.getElementById('dataPath');
                    if (dataPathInput && (!dataPathInput.value || dataPathInput.value.trim() === '')) {
                        const prepopulatedPath = getSelectedTechniqueBasePath();
                        if (prepopulatedPath) {
                            const populatedPath = populateDataPathTemplate(prepopulatedPath);
                            dataPathInput.value = populatedPath;
                            // Trigger validation
                            debounceValidation();
                        }
                    }
                }
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
    
    // Save sort state to sessionStorage
    saveSortStateToSession();
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

// Save sort state to sessionStorage
function saveSortStateToSession() {
    try {
        sessionStorage.setItem('tableSort', JSON.stringify(currentSortState));
    } catch (e) {
        console.warn('Could not save sort state to sessionStorage:', e);
    }
}

// Load sort state from sessionStorage
function loadSortStateFromSession() {
    try {
        const saved = sessionStorage.getItem('tableSort');
        if (saved) {
            const parsedState = JSON.parse(saved);
            if (Array.isArray(parsedState) && parsedState.length > 0) {
                return parsedState;
            }
        }
    } catch (e) {
        console.warn('Could not load sort state from sessionStorage:', e);
    }
    return null;
}

// Set default sorting to ESAF column
function setDefaultSorting() {
    // Try to load saved sort state first
    const savedState = loadSortStateFromSession();
    
    if (savedState) {
        // Use saved sort state
        currentSortState = savedState;
    } else {
        // Use default sort (ESAF column in ascending order)
        currentSortState = [{ column: 'experiment', direction: 'asc' }];
        saveSortStateToSession();
    }
    
    updateSortUI();
    sortTableByState('experimentsTableBody');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    fetchAcknowledgmentOptions();
    initializeExperimentModal();
    initializeTableHandlers();
    initializeFilterFormAutoSubmit();
    initializeSortHandlers();
    initializeSearchFunctionality();
    
    // Set default sorting by ESAF column
    setDefaultSorting();
});
