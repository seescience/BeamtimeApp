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

// Fetch acknowledgment options from the backend
function fetchAcknowledgmentOptions() {
    fetch('/get_acknowledgments')
        .then(response => response.json())
        .then(data => {
            acknowledgmentOptions = data;
        })
        .catch(error => console.error('Error fetching acknowledgment options:', error));
}

// Update the badges for the "Delete" and "Create/Update" buttons
function updateBadges() {
    const selectedTableBody = document.getElementById('selectedTableBody');
    const deleteCountBadge = document.getElementById('deleteCount');
    const createUpdateCountBadge = document.getElementById('createUpdateCount');

    if (selectedTableBody) {
        const selectedRowsCount = selectedTableBody.querySelectorAll('tr').length;
        const checkedRowsCount = selectedTableBody.querySelectorAll('.select-experiment:checked').length;

        // Update the delete badge
        if (deleteCountBadge) {
            if (checkedRowsCount > 0) {
                deleteCountBadge.textContent = checkedRowsCount;
                deleteCountBadge.classList.remove('d-none');
            } else {
                deleteCountBadge.classList.add('d-none');
            }
        }

        // Update the create/update badge
        if (createUpdateCountBadge) {
            if (selectedRowsCount > 0) {
                createUpdateCountBadge.textContent = selectedRowsCount;
                createUpdateCountBadge.classList.remove('d-none');
            } else {
                createUpdateCountBadge.classList.add('d-none');
            }
        }
    }
}

// Attach event listeners to update badges when rows are selected/deselected
function attachRowSelectionListeners() {
    const selectedTableBody = document.getElementById('selectedTableBody');
    if (selectedTableBody) {
        selectedTableBody.addEventListener('change', event => {
            if (event.target.classList.contains('select-experiment')) {
                updateBadges();
            }
        });
    }

    // Attach event listener to the "Select All" checkbox for the selected table
    const selectAllSelected = document.getElementById('selectAllSelected');
    if (selectAllSelected) {
        selectAllSelected.addEventListener('change', () => {
            toggleSelectAll('selectedTableBody', selectAllSelected.checked);
            updateBadges();
        });
    }
}

// Add a new row to the "Selected/New Experiments" table
function addNewRow() {
    const addNewRowButton = document.getElementById('addNewRow');
    if (addNewRowButton) {
        addNewRowButton.addEventListener('click', () => {
            const selectedTableBody = document.getElementById('selectedTableBody');
            if (selectedTableBody) {
                selectedTableBody.appendChild(createRow());
                updateBadges();
            } else {
                console.error('Selected table body not found.');
            }
        });
    }
}

// Create a new row for the "Selected/New Experiments" table
function createRow() {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="checkbox" class="select-experiment" checked></td>
        <td><input type="text" class="form-control" placeholder="Title"></td>
        <td><input type="text" class="form-control editable-data-path" value="" style="width: 100%;"></td> <!-- Data Path -->
        <td><input type="text" class="form-control editable-pvlogger-path" value="" style="width: 100%;"></td> <!-- PVLogger Path -->
        <td>
            <div class="ack-container">
                <div class="ack-display"></div>
                <select class="form-control ack-dropdown">
                    <option value="" disabled selected>Add Acknowledgment</option>
                    ${acknowledgmentOptions.map(ack => `<option value="${ack.id}">${ack.title}</option>`).join('')}
                </select>
            </div>
        </td>
        <td><input type="checkbox" class="doi-checkbox" checked></td> <!-- DOI -->
        <td><input type="text" class="form-control" placeholder="Experiment"></td>
        <td><input type="text" class="form-control" placeholder="Proposal"></td>
        <td>New</td> <!-- Status -->
    `;
    initializeAcknowledgmentDropdown(row.querySelector('.ack-dropdown'));
    return row;
}

// Initialize the acknowledgment dropdown for a specific row
function initializeAcknowledgmentDropdown(dropdown) {
    dropdown.addEventListener('change', () => {
        const selectedOption = dropdown.options[dropdown.selectedIndex];
        const ackContainer = dropdown.closest('.ack-container');
        const display = ackContainer.querySelector('.ack-display');

        if (selectedOption.value) {
            const existingAck = Array.from(display.children).find(
                ack => ack.dataset.ackId === selectedOption.value
            );
            if (!existingAck) {
                const ackItem = document.createElement('span');
                ackItem.className = 'ack-item';
                ackItem.dataset.ackId = selectedOption.value;
                ackItem.innerHTML = `${selectedOption.text} <button onclick="removeAcknowledgment(this)">x</button>`;
                display.appendChild(ackItem);
            }
            dropdown.selectedIndex = 0;
        }
    });
}

// Remove an acknowledgment from the widget
function removeAcknowledgment(button) {
    const ackItem = button.closest('.ack-item');
    ackItem.remove();
}

// Add functionality to move rows between tables
function addMoveButtons() {
    const moveDownButton = document.getElementById('moveDown');
    const moveUpButton = document.getElementById('moveUp');

    if (moveDownButton) {
        moveDownButton.addEventListener('click', () => moveRows('availableTableBody', 'selectedTableBody'));
    }
    if (moveUpButton) {
        moveUpButton.addEventListener('click', () => moveRows('selectedTableBody', 'availableTableBody'));
    }
}

// Move rows between tables
function moveRows(sourceTableId, targetTableId) {
    const sourceTableBody = document.getElementById(sourceTableId);
    const targetTableBody = document.getElementById(targetTableId);

    if (!sourceTableBody || !targetTableBody) {
        console.error('Source or target table body not found.');
        return;
    }

    const selectedRows = sourceTableBody.querySelectorAll('.select-experiment:checked');

    selectedRows.forEach(checkbox => {
        const row = checkbox.closest('tr');
        const newRow = document.createElement('tr');

        // Map values from the source row to the correct fields in the target row
        const title = row.querySelector('td:nth-child(2)').innerText.trim();
        const experimentId = row.querySelector('td:nth-child(3)').innerText.trim();
        const proposal = row.querySelector('td:nth-child(4)').innerText.trim();
        const status = row.querySelector('td:nth-child(5)').innerText.trim();
        const userFolder = row.dataset.userFolder || '';

        newRow.innerHTML = `
            <td><input type="checkbox" class="select-experiment" checked></td>
            <td><input type="text" class="form-control" value="${title}" placeholder="Title"></td> <!-- Title -->
            <td><input type="text" class="form-control editable-data-path" value="${userFolder}" style="width: 100%;"></td> <!-- Data Path -->
            <td><input type="text" class="form-control editable-pvlogger-path" value="" style="width: 100%;"></td> <!-- PVLogger Path -->
            <td>
                <div class="ack-container">
                    <div class="ack-display"></div>
                    <select class="form-control ack-dropdown">
                        <option value="" disabled selected>Add Acknowledgment</option>
                        ${acknowledgmentOptions.map(ack => `<option value="${ack.id}">${ack.title}</option>`).join('')}
                    </select>
                </div>
            </td>
            <td><input type="checkbox" class="doi-checkbox" checked></td> <!-- DOI -->
            <td><input type="text" class="form-control" value="${experimentId}" placeholder="Experiment"></td> <!-- Experiment -->
            <td><input type="text" class="form-control" value="${proposal}" placeholder="Proposal"></td> <!-- Proposal -->
            <td>${status}</td> <!-- Status -->
        `;

        initializeAcknowledgmentDropdown(newRow.querySelector('.ack-dropdown'));
        targetTableBody.appendChild(newRow);
        row.remove();
    });

    updateBadges();
}

// Attach the "Move Down" button functionality
document.getElementById('moveDown').addEventListener('click', () => {
    moveRows('availableTableBody', 'selectedTableBody');
});

// Add functionality to toggle "Select All" checkboxes
function addSelectAllFunctionality() {
    const selectAllAvailable = document.getElementById('selectAllAvailable');
    const selectAllSelected = document.getElementById('selectAllSelected');

    if (selectAllAvailable) {
        selectAllAvailable.addEventListener('change', () => {
            toggleSelectAll('availableTableBody', selectAllAvailable.checked);
        });
    }

    if (selectAllSelected) {
        selectAllSelected.addEventListener('change', () => {
            toggleSelectAll('selectedTableBody', selectAllSelected.checked);
            updateBadges();
        });
    }
}

// Toggle the selection of all checkboxes in a table body
function toggleSelectAll(tableBodyId, isChecked) {
    const tableBody = document.getElementById(tableBodyId);
    if (tableBody) {
        tableBody.querySelectorAll('.select-experiment').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
    }
    updateBadges();
}

// Handle the form submission as application/json
function submitFilterForm() {
    const runSelect = document.getElementById('runSelect');
    const beamlineSelect = document.getElementById('beamlineSelect');
    const availableTableBody = document.getElementById('availableTableBody');

    const data = {
        run: runSelect.value,
        beamline: beamlineSelect.value
    };

    fetch('/filter_experiments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(experiments => {
        availableTableBody.innerHTML = '';

        experiments.forEach(experiment => {
            const row = document.createElement('tr');
            row.className = 'experiment-row';
            row.setAttribute('data-run', experiment.run_id);
            row.setAttribute('data-beamline', experiment.beamline_id);
            row.innerHTML = `
                <td><input type="checkbox" class="select-experiment"></td>
                <td>${experiment.title}</td>
                <td>${experiment.id}</td>
                <td>${experiment.proposal || 'N/A'}</td>
                <td>${experiment.process_status || 'N/A'}</td>
            `;
            availableTableBody.appendChild(row);
        });
    })
    .catch(error => console.error('Error fetching filtered experiments:', error));
}

// Add functionality to delete selected rows from the "Selected/New Experiments" table
function deleteSelectedRows() {
    const selectedTableBody = document.getElementById('selectedTableBody');
    const availableTableBody = document.getElementById('availableTableBody');
    const selectedRows = selectedTableBody.querySelectorAll('.select-experiment:checked');

    if (!selectedTableBody || !availableTableBody) {
        console.error('Selected or available table body not found.');
        return;
    }

    selectedRows.forEach(checkbox => {
        const row = checkbox.closest('tr');
        const experimentId = row.querySelector('td:nth-child(7) input')?.value.trim();
        const title = row.querySelector('td:nth-child(2) input')?.value.trim();
        const proposal = row.querySelector('td:nth-child(8) input')?.value.trim();
        const status = row.querySelector('td:nth-child(9)')?.innerText.trim();

        if (experimentId && !isNaN(parseInt(experimentId))) {
            // If the experiment is originally from the database, move it back to the available table
            const newRow = document.createElement('tr');
            newRow.className = 'experiment-row';
            newRow.innerHTML = `
                <td><input type="checkbox" class="select-experiment"></td>
                <td>${title}</td> <!-- Title -->
                <td>${experimentId}</td> <!-- Experiment -->
                <td>${proposal || 'N/A'}</td> <!-- Proposal -->
                <td>${status || 'N/A'}</td> <!-- Status -->
            `;
            availableTableBody.appendChild(newRow);
        }

        // Remove the row from the selected table
        row.remove();
    });

    updateBadges(); // Update badges after deleting or moving rows
}

// Attach the "Delete" button functionality
document.getElementById('deleteRow').addEventListener('click', deleteSelectedRows);

// Initialize the "Delete" and "Move Up" button functionality
function initializeDeleteAndMoveUpButtons() {
    const deleteRowButton = document.getElementById('deleteRow');
    const moveUpButton = document.getElementById('moveUp');

    if (deleteRowButton) {
        deleteRowButton.addEventListener('click', deleteSelectedRows);
    }
    if (moveUpButton) {
        moveUpButton.addEventListener('click', () => {
            moveRows('selectedTableBody', 'availableTableBody');
            updateBadges();
        });
    }
}

let currentDataPathInput = null;

// Initialize the modal for editing Data Path
function initializeDataPathModal() {
    const dataPathModal = new bootstrap.Modal(document.getElementById('dataPathModal'));
    const dataPathInput = document.getElementById('dataPathInput');
    const saveDataPathButton = document.getElementById('saveDataPathButton');

    // Attach click event to all existing and future editable data path input boxes
    document.getElementById('selectedTableBody').addEventListener('click', event => {
        const input = event.target.closest('.editable-data-path');
        if (input) {
            currentDataPathInput = input;
            dataPathInput.value = input.value || '';
            dataPathModal.show();
        }
    });

    saveDataPathButton.addEventListener('click', () => {
        if (currentDataPathInput) {
            const newPath = dataPathInput.value;
            currentDataPathInput.value = newPath;
            dataPathModal.hide();
        }
    });
}

let currentPvLoggerPathInput = null; // Track the input box being edited for PVLogger Path

// Initialize the modal for editing PVLogger Path
function initializePvLoggerPathModal() {
    const pvLoggerPathModal = new bootstrap.Modal(document.getElementById('pvLoggerPathModal'));
    const pvLoggerPathInput = document.getElementById('pvLoggerPathInput');
    const savePvLoggerPathButton = document.getElementById('savePvLoggerPathButton');

    // Attach click event to all existing and future editable PVLogger Path input boxes
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
            const newPath = pvLoggerPathInput.value;
            currentPvLoggerPathInput.value = newPath;
            pvLoggerPathModal.hide();
        }
    });
}

// Attach functionality to the "Create/Update" button
document.getElementById('createUpdate').addEventListener('click', () => {
    const selectedTableBody = document.getElementById('selectedTableBody');
    const rows = [];

    selectedTableBody.querySelectorAll('tr').forEach(row => {
        const title = row.querySelector('td:nth-child(2) input')?.value.trim();
        const dataPath = row.querySelector('td:nth-child(3) input')?.value.trim();
        const pvlogPath = row.querySelector('td:nth-child(4) input')?.value.trim();
        const doi = row.querySelector('td:nth-child(6) input')?.checked;
        const experimentNumber = row.querySelector('td:nth-child(7) input')?.value.trim();
        const proposalNumber = row.querySelector('td:nth-child(8) input')?.value.trim();
        const acknowledgmentIds = Array.from(row.querySelectorAll('.ack-item')).map(ack => ack.dataset.ackId);

        // Skip completely empty rows
        if (title || dataPath || pvlogPath || doi || experimentNumber || proposalNumber || acknowledgmentIds.length > 0) {
            rows.push({
                experiment_number: experimentNumber || null,
                title: title || null,
                data_path: dataPath || null,
                pvlog_path: pvlogPath || null,
                doi: doi || null,
                proposal_number: proposalNumber || null,
                acknowledgments: acknowledgmentIds,
            });
        }
    });

    fetch('/create_update_queue', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rows }),
    })
        .then(response => response.json())
        .then(result => {
            if (result.failure === 0) {
                alert(`Successfully added ${result.success} rows to the queue.`);
                // Remove successfully added rows from the table
                selectedTableBody.querySelectorAll('tr').forEach(row => row.remove());
                updateBadges(); // Update badges after rows are removed
            } else {
                alert(`Added ${result.success} rows to the queue, but ${result.failure} rows failed.`);
            }
        })
        .catch(error => {
            console.error('Error adding rows to the queue:', error);
            alert('An error occurred while adding rows to the queue.');
        });
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    fetchAcknowledgmentOptions();
    addNewRow();
    addMoveButtons();
    addSelectAllFunctionality();
    initializeDeleteAndMoveUpButtons();
    initializeDataPathModal();
    initializePvLoggerPathModal();
    attachRowSelectionListeners();
    updateBadges();
});