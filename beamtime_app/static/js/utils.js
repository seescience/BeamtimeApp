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

            // Update the acknowledgments list in the modal
            const acknowledgementsListContainer = document.querySelector('.acknowledgments-list');
            if (!acknowledgementsListContainer) return;

            // Clear existing options
            acknowledgementsListContainer.innerHTML = '';

            data.forEach(ack => {
                const formCheck = document.createElement('div');
                formCheck.className = 'form-check';

                formCheck.innerHTML = `
                    <input class="form-check-input" type="checkbox" value="${ack.id}" id="ack${ack.id}">
                    <label class="form-check-label" for="ack${ack.id}">
                        ${ack.title}
                    </label>
                `;

                acknowledgementsListContainer.appendChild(formCheck);
            });
        })
        .catch(error => console.error('Error fetching acknowledgment options:', error));
}

// Toggle all checkboxes in a table
function toggleSelectAll(tableId, checked) {
    const tableBody = document.getElementById(tableId);
    if (tableBody) {
        tableBody.querySelectorAll('.select-experiment').forEach(checkbox => {
            checkbox.checked = checked;
        });
    }
}

// Update badge counts for delete and create/update buttons
function updateBadges() {
    const selectedCount = document.querySelectorAll('#selectedTableBody .select-experiment:checked').length;
    const deleteCount = document.getElementById('deleteCount');
    const createUpdateCount = document.getElementById('createUpdateCount');

    if (deleteCount) {
        deleteCount.textContent = selectedCount;
        deleteCount.classList.toggle('d-none', selectedCount === 0);
    }

    if (createUpdateCount) {
        // Use selectedCount instead of totalRows
        createUpdateCount.textContent = selectedCount;
        createUpdateCount.classList.toggle('d-none', selectedCount === 0);
    }
}

// Delete selected rows from the table
function deleteSelectedRows() {
    const selectedTableBody = document.getElementById('selectedTableBody');
    if (!selectedTableBody) return;

    const checkboxes = selectedTableBody.querySelectorAll('.select-experiment:checked');
    checkboxes.forEach(checkbox => {
        checkbox.closest('tr').remove();
    });

    updateBadges();
}

// Move rows between tables
function moveRows(sourceTableId, targetTableId) {
    const sourceTableBody = document.getElementById(sourceTableId);
    const targetTableBody = document.getElementById(targetTableId);
    if (!sourceTableBody || !targetTableBody) return;

    const selectedRows = Array.from(sourceTableBody.querySelectorAll('.select-experiment:checked'));
    
    // If moving to selected table, ensure we have the current data path template
    if (targetTableId === 'selectedTableBody') {
        ensureDataPathTemplate().then(() => {
            processRowMove();
        }).catch(() => {
            // Proceed without template if fetch fails
            processRowMove();
        });
    } else {
        processRowMove();
    }

    function processRowMove() {
        selectedRows.forEach(checkbox => {
            const row = checkbox.closest('tr');
            
            if (targetTableId === 'availableTableBody') {
                // Only move back rows that came from the available table
                // Check if the status is "New" which indicates it was manually created
                const status = row.querySelector('td:nth-child(9)').textContent.trim();
                if (status === 'New') {
                    // Skip moving manually created rows
                    return;
                }

                // Moving back to available table - restore original format
                const title = row.querySelector('td:nth-child(2) input').value.trim();
                const experimentId = row.querySelector('td:nth-child(7) input').value.trim();
                const proposal = row.querySelector('td:nth-child(8) input').value.trim();
                const userFolder = row.querySelector('td:nth-child(3) input').value.trim();

                const newRow = document.createElement('tr');
                newRow.className = 'experiment-row';
                newRow.dataset.userFolder = userFolder;
                newRow.innerHTML = `
                    <td>
                        <input type="checkbox" class="select-experiment" 
                               name="selected_experiments" 
                               value="${experimentId}">
                    </td>
                    <td>${title}</td>
                    <td>${experimentId}</td>
                    <td>${proposal}</td>
                    <td>${status}</td>
                `;
                targetTableBody.appendChild(newRow);
                row.remove();
            } else {
                // Moving to selected table - convert to editable format
                const title = row.querySelector('td:nth-child(2)').textContent.trim();
                const experimentId = row.querySelector('td:nth-child(3)').textContent.trim();
                const proposal = row.querySelector('td:nth-child(4)').textContent.trim();
                const status = row.querySelector('td:nth-child(5)').textContent.trim();
                const userFolder = row.dataset.userFolder || '';
                const runId = row.dataset.run || '';

                // Extract run number from runId (e.g., "2025-1" -> "1")
                const runNumber = runId.includes('-') ? runId.split('-').pop() : runId;

                // Use template path with run number context
                const formattedDataPath = dataPathTemplate ? 
                    formatDataPath(dataPathTemplate, { runId: runNumber }) : 
                    userFolder;

                const newRow = document.createElement('tr');
                newRow.innerHTML = `
                    <td><input type="checkbox" class="select-experiment" checked></td>
                    <td><input type="text" class="form-control" value="${title}" placeholder="Title"></td>
                    <td><input type="text" class="form-control editable-data-path" value="${formattedDataPath}" style="width: 100%;"></td>
                    <td><input type="text" class="form-control editable-pvlogger-path" value="" style="width: 100%;"></td>
                    <td>
                        <input type="text" class="form-control editable-acknowledgments" readonly placeholder="Click to add acknowledgments">
                        <div class="acknowledgments-tooltip"></div>
                        <input type="hidden" class="acknowledgments-data">
                    </td>
                    <td><input type="checkbox" class="doi-checkbox" checked></td>
                    <td><input type="text" class="form-control" value="${experimentId}" placeholder="Experiment"></td>
                    <td><input type="text" class="form-control" value="${proposal}" placeholder="Proposal"></td>
                    <td>${status}</td>
                `;
                targetTableBody.appendChild(newRow);
                row.remove();
            }
        });

        updateBadges();
    }
}

// Initialize modal for editing Data Path
function initializeDataPathModal() {
    const dataPathModal = new bootstrap.Modal(document.getElementById('dataPathModal'));
    const dataPathInput = document.getElementById('dataPathInput');
    const saveDataPathButton = document.getElementById('saveDataPathButton');
    const pathValidationMessage = document.getElementById('pathValidationMessage');
    let currentDataPathInput = null;
    let validationTimeout = null;

    // Function to update validation message
    function updateValidationMessage(exists, valid, message) {
        if (!pathValidationMessage) return;
        
        pathValidationMessage.textContent = message;
        
        // Remove existing classes
        pathValidationMessage.classList.remove('text-success', 'text-warning', 'text-danger', 'text-muted');
        
        if (valid === false) {
            // Invalid path format
            pathValidationMessage.classList.add('text-danger');
        } else if (exists === true) {
            // Path exists - warning
            pathValidationMessage.classList.add('text-warning');
        } else if (exists === false) {
            // Path available - success
            pathValidationMessage.classList.add('text-success');
        } else {
            // Unknown state or validating
            pathValidationMessage.classList.add('text-muted');
        }
    }

    // Function to validate path with debouncing
    function validatePath() {
        const path = dataPathInput.value;
        
        if (validationTimeout) {
            clearTimeout(validationTimeout);
        }
        
        if (!path || !path.trim()) {
            updateValidationMessage(null, null, '');
            return;
        }
        
        updateValidationMessage(null, null, 'Validating...');
        
        validationTimeout = setTimeout(() => {
            validateDataPath(path)
                .then(result => {
                    updateValidationMessage(result.exists, result.valid, result.message);
                })
                .catch(error => {
                    console.error('Validation error:', error);
                    updateValidationMessage(null, false, 'Validation failed');
                });
        }, 500); // 500ms debounce delay
    }

    document.getElementById('selectedTableBody').addEventListener('click', event => {
        const input = event.target.closest('.editable-data-path');
        if (input) {
            currentDataPathInput = input;
            dataPathInput.value = input.value || '';
            
            // Clear any existing timeout
            if (validationTimeout) {
                clearTimeout(validationTimeout);
            }
            
            // Validate the current path
            validatePath();
            
            dataPathModal.show();
        }
    });

    // Add input event listener for real-time validation
    dataPathInput.addEventListener('input', validatePath);

    saveDataPathButton.addEventListener('click', () => {
        if (currentDataPathInput) {
            currentDataPathInput.value = dataPathInput.value;
            dataPathModal.hide();
        }
    });

    // Clear validation when modal is hidden
    dataPathModal._element.addEventListener('hidden.bs.modal', () => {
        if (validationTimeout) {
            clearTimeout(validationTimeout);
        }
        updateValidationMessage(null, null, '');
    });
}

// TODO: Not fully implemented yet
// Initialize modal for editing PVLogger Path
function initializePvLoggerPathModal() {
    const pvLoggerPathModal = new bootstrap.Modal(document.getElementById('pvLoggerPathModal'));
    const pvLoggerPathInput = document.getElementById('pvLoggerPathInput');
    const savePvLoggerPathButton = document.getElementById('savePvLoggerPathButton');
    let currentPvLoggerPathInput = null;

    document.getElementById('selectedTableBody').addEventListener('click', event => {
        const input = event.target.closest('.editable-pvlogger-path');
        if (input) {
            currentPvLoggerPathInput = input;
            pvLoggerPathInput.value = input.value || '';
            pvLoggerPathModal.show();
        }
    });

    savePvLoggerPathButton.addEventListener('click', () => {
        if (currentPvLoggerPathInput) {
            currentPvLoggerPathInput.value = pvLoggerPathInput.value;
            pvLoggerPathModal.hide();
        }
    });
}

// Initialize modal for editing Acknowledgments
function initializeAcknowledgmentsModal() {
    const acknowledgementsModal = new bootstrap.Modal(document.getElementById('acknowledgementsModal'));
    const saveAcknowledgmentsButton = document.getElementById('saveAcknowledgmentsButton');
    let currentAcknowledgmentsInput = null;
    let currentAcknowledgmentsData = null;

    document.querySelector('.acknowledgments-list').addEventListener('click', event => {
        const formCheck = event.target.closest('.form-check');
        if (formCheck) {
            const checkbox = formCheck.querySelector('.form-check-input');
            if (event.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
            }
        }
    });

    document.getElementById('selectedTableBody').addEventListener('click', event => {
        const input = event.target.closest('.editable-acknowledgments');
        if (input) {
            currentAcknowledgmentsInput = input;
            currentAcknowledgmentsData = input.nextElementSibling.nextElementSibling;
            
            document.querySelectorAll('.acknowledgments-list .form-check-input').forEach(checkbox => {
                checkbox.checked = false;
            });

            if (currentAcknowledgmentsData.value) {
                const selectedAcks = JSON.parse(currentAcknowledgmentsData.value);
                selectedAcks.forEach(ackId => {
                    const checkbox = document.getElementById(`ack${ackId}`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }

            acknowledgementsModal.show();
        }
    });

    saveAcknowledgmentsButton.addEventListener('click', () => {
        if (currentAcknowledgmentsInput && currentAcknowledgmentsData) {
            const selectedAcks = [];
            const selectedTitles = [];
            
            document.querySelectorAll('.acknowledgments-list .form-check-input:checked').forEach(checkbox => {
                selectedAcks.push(checkbox.value);
                selectedTitles.push(checkbox.nextElementSibling.textContent.trim());
            });

            currentAcknowledgmentsData.value = JSON.stringify(selectedAcks);
            currentAcknowledgmentsInput.value = selectedTitles.length > 0 
                ? selectedTitles.length + ' acknowledgment(s) selected'
                : '';
            acknowledgementsModal.hide();
        }
    });
}

// Handle Create/Update button click
function handleCreateUpdate() {
    const selectedTableBody = document.getElementById('selectedTableBody');
    if (!selectedTableBody) return;

    const rows = Array.from(selectedTableBody.querySelectorAll('tr')).map(row => {
        const getValue = (selector) => row.querySelector(selector)?.value?.trim() || null;
        const getChecked = (selector) => row.querySelector(selector)?.checked || false;
        
        const data = {
            experiment_number: getValue('td:nth-child(7) input'),
            title: getValue('td:nth-child(2) input'),
            data_path: getValue('td:nth-child(3) input'),
            pvlog_path: getValue('td:nth-child(4) input'),
            doi: getChecked('td:nth-child(6) input'),
            proposal_number: getValue('td:nth-child(8) input'),
            acknowledgments: (() => {
                const ackData = row.querySelector('.acknowledgments-data');
                if (ackData && ackData.value) {
                    try {
                        return JSON.parse(ackData.value);
                    } catch (e) {
                        return [];
                    }
                }
                return [];
            })()
        };

        return Object.values(data).some(value => 
            value !== null && value !== false && 
            (Array.isArray(value) ? value.length > 0 : true)
        ) ? data : null;
    }).filter(Boolean);

    if (rows.length === 0) return;

    fetch('/api/v1/create_update_queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
    })
    .then(response => response.json())
    .then(result => {
        if (result.failure === 0) {
            selectedTableBody.innerHTML = '';
            updateBadges();
            showNotification('Success', `Successfully added ${result.success} rows to the queue.`);
        } else {
            showNotification('Warning', `Added ${result.success} rows to the queue, but ${result.failure} rows failed.`);
        }
    })
    .catch(error => {
        console.error('Error adding rows to the queue:', error);
        showNotification('Error', 'An error occurred while adding rows to the queue.');
    });
}

// Initialize table handlers
function initializeTableHandlers() {
    const buttons = {
        moveDown: document.getElementById('moveDown'),
        moveUp: document.getElementById('moveUp'),
        addNew: document.getElementById('addNewRow'),
        delete: document.getElementById('deleteRow'),
        createUpdate: document.getElementById('createUpdate'),
        selectAllAvailable: document.getElementById('selectAllAvailable'),
        selectAllSelected: document.getElementById('selectAllSelected')
    };

    if (buttons.moveDown) {
        buttons.moveDown.addEventListener('click', () => moveRows('availableTableBody', 'selectedTableBody'));
    }

    if (buttons.moveUp) {
        buttons.moveUp.addEventListener('click', () => moveRows('selectedTableBody', 'availableTableBody'));
    }

    if (buttons.addNew) {
        buttons.addNew.addEventListener('click', () => {
            const selectedTableBody = document.getElementById('selectedTableBody');
            if (selectedTableBody) {
                // Ensure we have the current data path template before creating new row
                ensureDataPathTemplate().then(() => {
                    selectedTableBody.appendChild(createRow());
                    updateBadges();
                }).catch(() => {
                    // Proceed without template if fetch fails
                    selectedTableBody.appendChild(createRow());
                    updateBadges();
                });
            }
        });
    }

    if (buttons.delete) {
        buttons.delete.addEventListener('click', deleteSelectedRows);
    }

    if (buttons.createUpdate) {
        buttons.createUpdate.addEventListener('click', handleCreateUpdate);
    }

    if (buttons.selectAllAvailable) {
        buttons.selectAllAvailable.addEventListener('change', () => {
            toggleSelectAll('availableTableBody', buttons.selectAllAvailable.checked);
        });
    }

    if (buttons.selectAllSelected) {
        buttons.selectAllSelected.addEventListener('change', () => {
            toggleSelectAll('selectedTableBody', buttons.selectAllSelected.checked);
            updateBadges();
        });
    }

    const selectedTableBody = document.getElementById('selectedTableBody');
    if (selectedTableBody) {
        selectedTableBody.addEventListener('change', event => {
            if (event.target.classList.contains('select-experiment')) {
                updateBadges();
            }
        });
    }
}

// Initialize modals
function initializeModals() {
    initializeDataPathModal();
    initializePvLoggerPathModal();
    initializeAcknowledgmentsModal();
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
    
    // Only fetch if we don't have a template or if the selection has changed
    return fetchDataPathTemplate(stationId, techniqueId);
}

// Function to update data paths for existing rows in selected table
function updateDataPathForExistingRows() {
    const selectedTableBody = document.getElementById('selectedTableBody');
    if (!selectedTableBody || !dataPathTemplate) return;
    
    const rows = selectedTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const dataPathInput = row.querySelector('.editable-data-path');
        const experimentInput = row.querySelector('td:nth-child(7) input');
        
        if (dataPathInput && experimentInput) {
            const experimentId = experimentInput.value;
            const runMatch = experimentId.match(/\d+/);
            const runId = runMatch ? runMatch[0] : '';
            
            // Only update if the current value looks like it was generated from a template
            // (to avoid overwriting user-modified paths)
            const currentValue = dataPathInput.value;
            if (!currentValue || currentValue.includes('{') || currentValue.includes('/data/') || currentValue.includes('Run')) {
                dataPathInput.value = formatDataPath(dataPathTemplate, { runId: runId });
            }
        }
    });
}

// Auto-submit filter form on dropdown change and fetch data path template
function initializeFilterFormAutoSubmit() {
    const filterForm = document.getElementById('filterForm');
    const stationSelect = document.getElementById('stationSelect');
    const techniqueSelect = document.getElementById('techniqueSelect');
    
    if (filterForm) {
        const selects = filterForm.querySelectorAll('select');
        selects.forEach(select => {
            select.addEventListener('change', () => {
                filterForm.submit();
            });
        });
    }
    
    // Listen for station/technique changes to update data path template
    if (stationSelect && techniqueSelect) {
        const handleTemplateUpdate = () => {
            const stationId = stationSelect.value;
            const techniqueId = techniqueSelect.value;
            
            if (stationId && techniqueId) {
                fetchDataPathTemplate(stationId, techniqueId)
                    .then(() => {
                        updateDataPathForExistingRows();
                    })
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

function createRow() {
    // Get the run number from the selected run dropdown
    const runSelect = document.getElementById('runSelect');
    let runNumber = '';
    
    if (runSelect && runSelect.value) {
        // Get the selected option text (which contains the run name like "2025-1")
        const selectedOption = runSelect.options[runSelect.selectedIndex];
        if (selectedOption && selectedOption.text !== 'All') {
            const runName = selectedOption.text;
            // Extract run number from runName (e.g., "2025-1" -> "1")
            runNumber = runName.includes('-') ? runName.split('-').pop() : runName;
        }
    }
    
    // Use the current data path template for new rows with run context
    const formattedDataPath = formatDataPath(dataPathTemplate, { runId: runNumber });
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="checkbox" class="select-experiment" checked></td>
        <td><input type="text" class="form-control" placeholder="Title"></td>
        <td><input type="text" class="form-control editable-data-path" value="${formattedDataPath}" style="width: 100%;"></td>
        <td><input type="text" class="form-control editable-pvlogger-path" value="" style="width: 100%;"></td>
        <td>
            <input type="text" class="form-control editable-acknowledgments" readonly placeholder="Click to add acknowledgments">
            <div class="acknowledgments-tooltip"></div>
            <input type="hidden" class="acknowledgments-data">
        </td>
        <td><input type="checkbox" class="doi-checkbox" checked></td>
        <td><input type="text" class="form-control" placeholder="Experiment"></td>
        <td><input type="text" class="form-control" placeholder="Proposal"></td>
        <td>New</td>
    `;
    return row;
}

function showNotification(type, message) {
    // You can implement this function to show notifications in a more user-friendly way
    // For now, we'll use alert
    alert(message);
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

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    fetchAcknowledgmentOptions();
    initializeTableHandlers();
    initializeModals();
    updateBadges();
    initializeFilterFormAutoSubmit();
});
