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

let currentSortState = [];
let currentViewExperimentId = null;
let currentEditingExperiment = null;

function statusCssClass(status) {
    return `status-${String(status || 'unknown').toLowerCase().replace(/\s+/g, '-')}`;
}

function createStatusBadge(status) {
    const badge = document.createElement('span');
    badge.className = `status-badge ${statusCssClass(status)}`;
    badge.textContent = status;
    return badge;
}

function applyPvlogSourceResult(result, options = {}) {
    const templateSelect = document.getElementById('pvLoggerTemplateSelect');

    if (result.success) {
        if (templateSelect) templateSelect.value = '';
        clearUploadedFile();
        setPvLoggerPathDisplay(result.path);
        loadPvlogEditor(result.path);
        showNotification('success', result.message);
        return true;
    }

    showNotification('error', result.error || options.errorMessage || 'PVLogger file operation failed');
    if (options.resetOnError) {
        clearFileSelection();
    }
    return false;
}

function populateDataPathField(userFolder) {
    const dataPathEl = document.getElementById('dataPath');
    if (!dataPathEl) return;

    if (userFolder && userFolder.trim() !== '') {
        dataPathEl.value = userFolder;
        return;
    }

    const prepopulatedPath = getSelectedTechniqueBasePath();
    dataPathEl.value = prepopulatedPath ? populateDataPathTemplate(prepopulatedPath) : '';
}

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
                        const runText = runOption ? runOption.textContent.trim() : String(experiment.run_id);
                        runNumber = runText.includes('-') ? runText.split('-').pop() : runText;
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
                        const runText = runOption ? runOption.textContent.trim() : String(experiment.run_id);
                        runNumber = runText.includes('-') ? runText.split('-').pop() : runText;
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

// Update visible PVLogger path inside the template/file picker
function setPvLoggerPathDisplay(path) {
    const pathRow = document.getElementById('pvLoggerPathDisplayRow');
    const pathDisplay = document.getElementById('pvLoggerPathDisplay');
    const hiddenInput = document.getElementById('pvLoggerPathValue');
    const templateSelect = document.getElementById('pvLoggerTemplateSelect');

    if (hiddenInput) hiddenInput.value = path || '';

    if (path) {
        const displayName = path.split('/').pop() || path;
        if (pathDisplay) {
            pathDisplay.textContent = displayName;
            pathDisplay.title = path;
        }
        if (pathRow) pathRow.hidden = false;
        if (templateSelect) templateSelect.hidden = true;
    } else {
        if (pathDisplay) {
            pathDisplay.textContent = '';
            pathDisplay.title = '';
        }
        if (pathRow) pathRow.hidden = true;
        if (templateSelect) templateSelect.hidden = false;
    }
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
    const createBtn = document.getElementById('createNewPvlogBtn');
    const clearBtn = document.getElementById('clearFileBtn');
    const templateSelect = document.getElementById('pvLoggerTemplateSelect');

    if (!fileInput || !selectBtn || !templateSelect) return;

    initializePvlogEditorWidgets();

    templateSelect.addEventListener('change', () => {
        clearUploadedFile();
        if (templateSelect.value) {
            setPvLoggerPathDisplay(templateSelect.value);
            loadPvlogEditor(templateSelect.value);
        } else {
            setPvLoggerPathDisplay('');
            hidePvlogEditor();
        }
    });

    if (createBtn) {
        createBtn.addEventListener('click', () => {
            createNewPvlogFile();
        });
    }

    selectBtn.addEventListener('click', () => {
        fileInput.click();
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearFileSelection();
        });
    }

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

// Create a new empty PVLogger file
function createNewPvlogFile() {
    const createBtn = document.getElementById('createNewPvlogBtn');
    const esafNumber = document.getElementById('experimentNumber').value;

    if (!esafNumber) {
        showNotification('error', 'ESAF number is required to create a PVLogger file');
        return;
    }

    if (createBtn) createBtn.disabled = true;

    fetch('/api/v1/create_pvlog_file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ esaf_number: esafNumber }),
    })
        .then(response => response.json())
        .then(result => {
            applyPvlogSourceResult(result, {
                errorMessage: 'Unable to create PVLogger file',
            });
        })
        .catch(error => {
            console.error('Create PVLogger file error:', error);
            showNotification('error', 'Unable to create PVLogger file. Please try again.');
        })
        .finally(() => {
            if (createBtn) createBtn.disabled = false;
        });
}

// Upload PVLogger file
function uploadPVLoggerFile(file) {
    const selectBtn = document.getElementById('selectFileBtn');
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
        applyPvlogSourceResult(result, {
            errorMessage: 'Upload failed',
            resetOnError: true,
        });
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
    if (fileInput) fileInput.value = '';
}

// Clear file selection and reset PVLogger state
function clearFileSelection() {
    const templateSelect = document.getElementById('pvLoggerTemplateSelect');
    const selectBtn = document.getElementById('selectFileBtn');
    const createBtn = document.getElementById('createNewPvlogBtn');

    clearUploadedFile();
    setPvLoggerPathDisplay('');
    hidePvlogEditor();
    if (templateSelect) templateSelect.value = '';
    if (selectBtn) selectBtn.disabled = false;
    if (createBtn) createBtn.disabled = false;
}

// Initialize experiment detail panel and form handlers
function initializeExperimentViews() {
    document.querySelectorAll('.acknowledgment-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedAcknowledgments);
    });

    const addBtn = document.getElementById('addToQueueBtn');
    if (addBtn) addBtn.addEventListener('click', addSingleExperimentToQueue);

    const validateBtn = document.getElementById('validatePathBtn');
    if (validateBtn) validateBtn.addEventListener('click', validateCurrentPath);

    const backBtn = document.getElementById('backToExperimentsBtn');
    if (backBtn) backBtn.addEventListener('click', handleExperimentBack);

    const editBtn = document.getElementById('detailEditBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (currentViewExperimentId) {
                showExperimentEdit(currentViewExperimentId);
            }
        });
    }

    initializePVLoggerFilePicker();
    loadPVLoggerTemplates();
    initializeDoiCheckboxes();
    initializeDataPathTemplates();

    const dataPathEl = document.getElementById('dataPath');
    if (dataPathEl) dataPathEl.addEventListener('input', debounceValidation);
}

function setDashboardTopbar(title, meta) {
    const titleEl = document.querySelector('.dash-page-title');
    const metaEl = document.querySelector('.dash-page-meta');
    const searchEl = document.querySelector('.dash-search');

    if (titleEl) titleEl.textContent = title;
    if (metaEl) metaEl.innerHTML = meta;
    if (searchEl) searchEl.style.display = title === 'Experiments' ? '' : 'none';
}

function handleExperimentBack() {
    const editPanel = document.getElementById('experimentEditPanel');
    if (editPanel && !editPanel.hidden && currentViewExperimentId) {
        showExperimentView(currentViewExperimentId);
        return;
    }
    showExperimentsList();
}

function showExperimentsList() {
    const panel = document.querySelector('.dash-panel');
    const listView = document.getElementById('experimentsListView');
    const detailView = document.getElementById('experimentDetailView');
    const totalCount = document.querySelectorAll('#experimentsTableBody .experiment-row').length;
    const visibleCount = document.getElementById('dashboardVisibleCount')?.textContent || totalCount;

    if (panel) panel.classList.remove('panel-has-detail');
    if (listView) listView.hidden = false;
    if (detailView) detailView.hidden = true;
    document.querySelectorAll('.experiment-row.row-active').forEach(r => r.classList.remove('row-active'));

    currentViewExperimentId = null;
    currentEditingExperiment = null;
    clearFileSelection();

    const metaEl = document.querySelector('.dash-page-meta');
    const lastSynced = metaEl?.dataset.lastSynced || 'N/A';
    setDashboardTopbar(
        'Experiments',
        `<span id="dashboardVisibleCount">${visibleCount}</span> of ${totalCount} shown &middot; Synced ${lastSynced}`
    );
}

function showExperimentView(experimentId) {
    const panel = document.querySelector('.dash-panel');
    const listView = document.getElementById('experimentsListView');
    const detailView = document.getElementById('experimentDetailView');
    const viewPanel = document.getElementById('experimentViewPanel');
    const editPanel = document.getElementById('experimentEditPanel');
    const editBtn = document.getElementById('detailEditBtn');
    const addToQueueBtn = document.getElementById('addToQueueBtn');

    currentViewExperimentId = experimentId;
    currentEditingExperiment = null;

    if (panel) panel.classList.add('panel-has-detail');
    if (listView) listView.hidden = false;
    if (detailView) detailView.hidden = false;

    document.querySelectorAll('.experiment-row.row-active').forEach(r => r.classList.remove('row-active'));
    const selectedRow = document.querySelector(`tr[data-experiment-id="${experimentId}"]`);
    if (selectedRow) selectedRow.classList.add('row-active');
    if (viewPanel) viewPanel.hidden = false;
    if (editPanel) editPanel.hidden = true;
    if (editBtn) editBtn.hidden = false;
    if (addToQueueBtn) addToQueueBtn.hidden = true;

    populateExperimentView(experimentId);

    const metaEl = document.querySelector('.dash-page-meta');
    const lastSynced = metaEl?.dataset.lastSynced || 'N/A';
    const totalCount = document.querySelectorAll('#experimentsTableBody .experiment-row').length;
    const visibleCount = document.getElementById('dashboardVisibleCount')?.textContent || totalCount;
    setDashboardTopbar(
        'Experiments',
        `<span id="dashboardVisibleCount">${visibleCount}</span> of ${totalCount} shown &middot; Synced ${lastSynced}`
    );
}

function showExperimentEdit(experimentId) {
    const viewPanel = document.getElementById('experimentViewPanel');
    const editPanel = document.getElementById('experimentEditPanel');
    const editBtn = document.getElementById('detailEditBtn');
    const addToQueueBtn = document.getElementById('addToQueueBtn');
    const form = document.getElementById('experimentForm');

    if (!document.getElementById('experimentDetailView') || document.getElementById('experimentDetailView').hidden) {
        showExperimentView(experimentId);
    }

    currentViewExperimentId = experimentId;
    currentEditingExperiment = experimentId;

    if (viewPanel) viewPanel.hidden = true;
    if (editPanel) editPanel.hidden = false;
    if (editBtn) editBtn.hidden = true;
    if (addToQueueBtn) {
        addToQueueBtn.hidden = false;
        addToQueueBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Add to Queue';
    }

    if (form) form.reset();
    clearValidationMessage();
    loadExperimentData(experimentId, 'edit');
    populateDataPathDropdown(experimentId);

    const metaEl2 = document.querySelector('.dash-page-meta');
    const lastSynced2 = metaEl2?.dataset.lastSynced || 'N/A';
    const totalCount2 = document.querySelectorAll('#experimentsTableBody .experiment-row').length;
    const visibleCount2 = document.getElementById('dashboardVisibleCount')?.textContent || totalCount2;
    setDashboardTopbar(
        'Experiments',
        `<span id="dashboardVisibleCount">${visibleCount2}</span> of ${totalCount2} shown &middot; Synced ${lastSynced2}`
    );
}

function populateExperimentView(experimentId) {
    const row = document.querySelector(`tr[data-experiment-id="${experimentId}"]`);
    if (!row) return;

    const experimentDataStr = row.getAttribute('data-experiment-data');
    if (!experimentDataStr) {
        console.warn('Missing experiment data for view:', experimentId);
        return;
    }

    try {
        populateViewDetails(JSON.parse(experimentDataStr));
    } catch (error) {
        console.error('Error parsing experiment data:', error);
    }
}

// Load experiment data into modal
function loadExperimentData(experimentId, mode = 'view') {
    const row = document.querySelector(`tr[data-experiment-id="${experimentId}"]`);
    if (!row) return;

    const expData = JSON.parse(row.getAttribute('data-experiment-data') || '{}');
    const proposal = String(expData.proposal || '');
    const experimentNumber = String(expData.id || '');
    const title = String(expData.title || '');
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

    populateDataPathField(userFolder);
    document.getElementById('createDoi').checked = mode !== 'edit';
    
    // Reset acknowledgments and PVLogger path
    clearFileSelection();

    // Pre-select pvlog_file from experiment data if available
    const experimentDataStr = row.getAttribute('data-experiment-data');
    if (experimentDataStr) {
        try {
            const experiment = JSON.parse(experimentDataStr);
            if (experiment.pvlog_file && experiment.pvlog_file !== 'N/A') {
                const templateSelect = document.getElementById('pvLoggerTemplateSelect');
                if (templateSelect) {
                    const matchingOption = templateSelect.querySelector(`option[value="${experiment.pvlog_file}"]`);
                    if (matchingOption) {
                        templateSelect.value = experiment.pvlog_file;
                    }
                }
                setPvLoggerPathDisplay(experiment.pvlog_file);
                loadPvlogEditor(experiment.pvlog_file);
            }
        } catch (e) {}
    }

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
    addToQueueBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Preparing...';

    preparePvlogQueueCopy()
        .then(() => {
            formData.set('pvLoggerPathValue', document.getElementById('pvLoggerPathValue')?.value || '');

            if (!dataPath || dataPath === '') {
                addToQueueBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Adding to Queue...';
                proceedWithAddToQueue(formData, addToQueueBtn, originalButtonContent);
                return;
            }

            addToQueueBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Validating...';

            return validateDataPath(dataPath)
                .then(validationResult => {
                    if (!validationResult.valid) {
                        showNotification('error', `Invalid data path: ${validationResult.message}`);
                        resetAddToQueueButton(addToQueueBtn, originalButtonContent);
                        return;
                    }

                    proceedWithAddToQueue(formData, addToQueueBtn, originalButtonContent);
                });
        })
        .catch(error => {
            console.error('PVLogger save before queue failed:', error);
            showNotification('error', error.message || 'Unable to save PVLogger changes before queueing.');
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
            showExperimentsList();
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

// Populate read-only experiment details with full data
function populateViewDetails(experiment) {
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
    const seesDoiEl = document.getElementById('detailViewSeesDoi');
    const apsDoiEl = document.getElementById('detailViewApsDoi');
    const esafPdfEl = document.getElementById('detailViewEsafPdf');
    const pvlogFileEl = document.getElementById('detailViewPvlogFile');

    if (titleEl) titleEl.textContent = experiment.title || 'N/A';
    if (esafEl) esafEl.textContent = experiment.id || 'N/A';
    if (proposalEl) proposalEl.textContent = experiment.proposal || 'N/A';
    
    // Status badge
    if (statusEl) {
        statusEl.innerHTML = '';
        if (experiment.process_status) {
            statusEl.appendChild(createStatusBadge(experiment.process_status));
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
    
    // SEES DOI with link
    if (seesDoiEl) {
        if (experiment.sees_doi && experiment.sees_doi !== 'N/A') {
            seesDoiEl.innerHTML = `<a href="https://doi.org/${experiment.sees_doi}" target="_blank">${experiment.sees_doi}</a>`;
        } else {
            seesDoiEl.textContent = 'N/A';
        }
    }

    // APS DOI with link
    if (apsDoiEl) {
        if (experiment.aps_doi && experiment.aps_doi !== 'N/A') {
            apsDoiEl.innerHTML = `<a href="https://doi.org/${experiment.aps_doi}" target="_blank">${experiment.aps_doi}</a>`;
        } else {
            apsDoiEl.textContent = 'N/A';
        }
    }
    
    // ESAF PDF with link
    if (esafPdfEl) {
        if (experiment.esaf_pdf_file && experiment.esaf_pdf_file !== 'N/A') {
            const pdfUrl = `/api/v1/serve_pdf?path=${encodeURIComponent(experiment.esaf_pdf_file)}`;
            esafPdfEl.innerHTML = `<a href="${pdfUrl}" target="_blank">View PDF</a>`;
        } else {
            esafPdfEl.textContent = 'N/A';
        }
    }

    // PVLog file
    if (pvlogFileEl) {
        pvlogFileEl.textContent = (experiment.pvlog_file && experiment.pvlog_file !== 'N/A') ? experiment.pvlog_file : 'N/A';
    }
}

// Initialize table event handlers
function initializeTableHandlers() {
    const tableBody = document.getElementById('experimentsTableBody');
    if (!tableBody) return;
    
    // Open view modal when clicking a row
    tableBody.addEventListener('click', (event) => {
        const row = event.target.closest('.experiment-row');
        if (!row) return;

        showExperimentView(row.getAttribute('data-experiment-id'));
    });
    
    // No bulk selection or processing for now
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


function updateDashboardVisibleCount() {
    const countEl = document.getElementById('dashboardVisibleCount');
    const tableBody = document.getElementById('experimentsTableBody');
    if (!countEl || !tableBody) return;

    const rows = tableBody.querySelectorAll('.experiment-row');
    let visible = 0;
    rows.forEach(row => {
        if (row.style.display !== 'none') {
            visible++;
        }
    });
    countEl.textContent = visible;
}

function initializeSidebar() {
    const dashboard = document.querySelector('.dashboard');
    const trigger = document.getElementById('sidebarTrigger');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!dashboard || !trigger) return;

    const closeSidebar = () => {
        dashboard.classList.remove('sidebar-open');
        if (backdrop) backdrop.hidden = true;
    };

    const openSidebar = () => {
        dashboard.classList.add('sidebar-open');
        if (backdrop) backdrop.hidden = false;
    };

    trigger.addEventListener('click', () => {
        if (dashboard.classList.contains('sidebar-open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    if (backdrop) {
        backdrop.addEventListener('click', closeSidebar);
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 992) {
            closeSidebar();
        }
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
    if (!tableBody) return;

    const rows = tableBody.querySelectorAll('.experiment-row');
    const term = searchTerm.toLowerCase().trim();
    
    rows.forEach(row => {
        if (!term) {
            row.style.display = '';
            return;
        }
        
        const expData = JSON.parse(row.getAttribute('data-experiment-data') || '{}');
        const proposal = String(expData.proposal || '').toLowerCase();
        const experimentId = String(expData.id || '').toLowerCase();
        const spokesperson = String(expData.spokesperson_name || '').toLowerCase();
        const title = String(expData.title || '').toLowerCase();
        
        const matches = proposal.includes(term) || 
                       experimentId.includes(term) || 
                       spokesperson.includes(term) || 
                       title.includes(term);
        
        row.style.display = matches ? '' : 'none';
    });

    updateDashboardVisibleCount();
}

// Auto-submit filter form on dropdown change
function initializeFilterFormAutoSubmit() {
    const filterForm = document.getElementById('filterForm');
    const techniqueSelect = document.getElementById('techniqueSelect');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    
    if (filterForm) {
        const selects = filterForm.querySelectorAll('select');

        function updateFilterPillState(select) {
            select.classList.toggle('filter-active', !!select.value);
        }

        selects.forEach(select => {
            updateFilterPillState(select);
            select.addEventListener('change', () => {
                updateFilterPillState(select);
                if (select === techniqueSelect && currentEditingExperiment) {
                    populateDataPathDropdown(currentEditingExperiment);
                    const dataPathInput = document.getElementById('dataPath');
                    if (dataPathInput && (!dataPathInput.value || dataPathInput.value.trim() === '')) {
                        const prepopulatedPath = getSelectedTechniqueBasePath();
                        if (prepopulatedPath) {
                            const populatedPath = populateDataPathTemplate(prepopulatedPath);
                            dataPathInput.value = populatedPath;
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
    const expData = JSON.parse(row.getAttribute('data-experiment-data') || '{}');
    switch (column) {
        case 'proposal':
            return String(expData.proposal || '');
        case 'experiment':
            return parseInt(expData.id, 10) || 0;
        case 'spokesperson':
            return String(expData.spokesperson_name || '').toLowerCase();
        case 'title':
            return String(expData.title || '').toLowerCase();
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
    statusBadge.className = `status-badge ${statusCssClass(newStatus)}`;
    
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
    initializeExperimentViews();
    initializeTableHandlers();
    initializeFilterFormAutoSubmit();
    initializeSortHandlers();
    initializeSearchFunctionality();
    initializeSidebar();
    
    // Set default sorting by ESAF column
    setDefaultSorting();
    updateDashboardVisibleCount();
});
