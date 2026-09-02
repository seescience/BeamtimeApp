/* ----------------------------------------------------------------------------------
 * Project: BeamtimeApp
 * File: beamtime_app/static/js/pvlog_editor.js
 * ----------------------------------------------------------------------------------
 * Purpose:
 * This file defines the JavaScript widgets for the PVLogger structured editor.
 * ----------------------------------------------------------------------------------
 * Author: Christofanis Skordas
 *
 * Copyright (C) 2025 GSECARS, The University of Chicago, USA
 * Copyright (C) 2025 NSF SEES, USA
 * ---------------------------------------------------------------------------------- */

let currentPvlogSourcePath = null;
let currentPvlogOriginalPath = null;
let pvlogEditorLoading = false;
let pvlogAutoSaveTimer = null;
let pvlogAutoSavePromise = null;

const PVLOG_AUTOSAVE_DELAY_MS = 600;

function setPvlogEditorStatus(message, state = '') {
    const statusEl = document.getElementById('pvLoggerEditorStatus');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove('is-dirty', 'is-saved');
    if (state) statusEl.classList.add(state);
}

function clearPvlogAutoSaveTimer() {
    if (pvlogAutoSaveTimer) {
        clearTimeout(pvlogAutoSaveTimer);
        pvlogAutoSaveTimer = null;
    }
}

function markPvlogEditorDirty() {
    if (pvlogEditorLoading) return;
    schedulePvlogOriginalSave();
}

function schedulePvlogOriginalSave() {
    if (!currentPvlogOriginalPath) return;

    clearPvlogAutoSaveTimer();
    setPvlogEditorStatus('Saving...');

    pvlogAutoSaveTimer = setTimeout(() => {
        pvlogAutoSaveTimer = null;
        savePvlogOriginal();
    }, PVLOG_AUTOSAVE_DELAY_MS);
}

function flushPvlogOriginalSave() {
    clearPvlogAutoSaveTimer();
    if (!currentPvlogOriginalPath) {
        return Promise.resolve();
    }
    if (pvlogAutoSavePromise) {
        return pvlogAutoSavePromise.then(() => savePvlogOriginal());
    }
    return savePvlogOriginal();
}

function savePvlogOriginal() {
    if (!currentPvlogOriginalPath || pvlogEditorLoading) {
        return Promise.resolve();
    }

    const esafNumber = document.getElementById('experimentNumber')?.value;

    pvlogAutoSavePromise = fetch('/api/v1/save_pvlog_file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            original_path: currentPvlogOriginalPath,
            source_path: currentPvlogOriginalPath,
            parsed: collectPvlogEditorData(),
            esaf_number: esafNumber,
            action: 'overwrite_original',
        }),
    })
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                throw new Error(result.error || 'Unable to save PVLogger file');
            }

            setPvlogEditorStatus('Saved', 'is-saved');
            return result;
        })
        .catch(error => {
            console.error('PVLogger auto-save error:', error);
            setPvlogEditorStatus('Save failed', 'is-dirty');
            throw error;
        })
        .finally(() => {
            pvlogAutoSavePromise = null;
        });

    return pvlogAutoSavePromise;
}

function clearPvlogEditorFields() {
    const start = document.getElementById('pvlogStartDatetime');
    const end = document.getElementById('pvlogEndDatetime');
    const credentials = document.getElementById('pvlogEscanCredentials');
    const instruments = document.getElementById('pvlogInstrumentsList');
    const pvsBody = document.getElementById('pvlogPvsBody');

    if (start) start.value = '';
    if (end) end.value = '';
    if (credentials) credentials.value = '';
    if (instruments) instruments.innerHTML = '';
    if (pvsBody) pvsBody.innerHTML = '';
}

function getCurrentExperimentData() {
    const experimentId = currentEditingExperiment || currentViewExperimentId;
    if (!experimentId) return null;

    const row = document.querySelector(`tr[data-experiment-id="${experimentId}"]`);
    if (!row) return null;

    try {
        return JSON.parse(row.getAttribute('data-experiment-data') || 'null');
    } catch (error) {
        console.error('Unable to parse experiment data for PVLogger defaults:', error);
        return null;
    }
}

function formatExperimentDatetime(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const pad = (part) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getExperimentScheduleDefaults() {
    const experiment = getCurrentExperimentData();
    if (!experiment) {
        return { start_datetime: '', end_datetime: '' };
    }

    return {
        start_datetime: formatExperimentDatetime(experiment.start_date),
        end_datetime: formatExperimentDatetime(experiment.end_date),
    };
}

function resolveScheduleValue(configValue, experimentValue) {
    return configValue?.trim() || experimentValue || '';
}

function createInstrumentRow(value = '') {
    const row = document.createElement('div');
    row.className = 'pvlog-instrument-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control form-control-sm pvlog-field pvlog-instrument-input';
    input.value = value;
    input.placeholder = 'Instrument name';
    input.addEventListener('input', markPvlogEditorDirty);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-link btn-sm text-danger pvlog-remove-btn';
    removeBtn.title = 'Remove instrument';
    removeBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
    removeBtn.addEventListener('click', () => {
        row.remove();
        markPvlogEditorDirty();
    });

    row.appendChild(input);
    row.appendChild(removeBtn);
    return row;
}

function createPvRow(entry = {}) {
    const row = document.createElement('tr');
    row.className = 'pvlog-pv-row';

    const fields = [
        { key: 'name', placeholder: '13IDE:m21.VAL', className: 'font-monospace' },
        { key: 'description', placeholder: 'Description', className: '' },
        { key: 'interval', placeholder: '0', className: 'font-monospace' },
    ];

    fields.forEach(({ key, placeholder, className }) => {
        const cell = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'text';
        input.className = `form-control form-control-sm pvlog-field pvlog-pv-input ${className}`.trim();
        input.dataset.pvField = key;
        input.value = entry[key] || '';
        input.placeholder = placeholder;
        input.addEventListener('input', markPvlogEditorDirty);
        cell.appendChild(input);
        row.appendChild(cell);
    });

    const actionsCell = document.createElement('td');
    actionsCell.className = 'pvlog-pv-actions-col';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-link btn-sm text-danger pvlog-remove-btn';
    removeBtn.title = 'Remove PV';
    removeBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
    removeBtn.addEventListener('click', () => {
        row.remove();
        markPvlogEditorDirty();
    });
    actionsCell.appendChild(removeBtn);
    row.appendChild(actionsCell);

    return row;
}

function populatePvlogEditor(parsed) {
    clearPvlogEditorFields();

    const config = parsed || {};
    const start = document.getElementById('pvlogStartDatetime');
    const end = document.getElementById('pvlogEndDatetime');
    const credentials = document.getElementById('pvlogEscanCredentials');
    const instrumentsList = document.getElementById('pvlogInstrumentsList');
    const pvsBody = document.getElementById('pvlogPvsBody');

    const scheduleDefaults = getExperimentScheduleDefaults();

    if (start) {
        start.value = resolveScheduleValue(config.start_datetime, scheduleDefaults.start_datetime);
    }
    if (end) {
        end.value = resolveScheduleValue(config.end_datetime, scheduleDefaults.end_datetime);
    }
    if (credentials) credentials.value = config.escan_credentials || '';

    const instruments = Array.isArray(config.instruments) ? config.instruments : [];
    if (instruments.length === 0) {
        instrumentsList?.appendChild(createInstrumentRow());
    } else {
        instruments.forEach(item => instrumentsList?.appendChild(createInstrumentRow(item)));
    }

    const pvs = Array.isArray(config.pvs) ? config.pvs : [];
    if (pvs.length === 0) {
        pvsBody?.appendChild(createPvRow());
    } else {
        pvs.forEach(entry => pvsBody?.appendChild(createPvRow(entry)));
    }
}

function collectPvlogEditorData() {
    const instruments = Array.from(document.querySelectorAll('.pvlog-instrument-input'))
        .map(input => input.value.trim())
        .filter(Boolean);

    const pvs = Array.from(document.querySelectorAll('.pvlog-pv-row'))
        .map(row => {
            const name = row.querySelector('[data-pv-field="name"]')?.value.trim() || '';
            const description = row.querySelector('[data-pv-field="description"]')?.value.trim() || '';
            const interval = row.querySelector('[data-pv-field="interval"]')?.value.trim() || '';
            return { name, description, interval };
        })
        .filter(entry => entry.name || entry.description || entry.interval);

    const scheduleDefaults = getExperimentScheduleDefaults();
    const startValue = document.getElementById('pvlogStartDatetime')?.value.trim() || '';
    const endValue = document.getElementById('pvlogEndDatetime')?.value.trim() || '';

    return {
        start_datetime: resolveScheduleValue(startValue, scheduleDefaults.start_datetime),
        end_datetime: resolveScheduleValue(endValue, scheduleDefaults.end_datetime),
        escan_credentials: document.getElementById('pvlogEscanCredentials')?.value.trim() || '',
        instruments,
        pvs,
    };
}

function hidePvlogEditor() {
    const editorRow = document.getElementById('pvLoggerEditorRow');
    const editorFields = document.getElementById('pvLoggerEditorFields');

    clearPvlogAutoSaveTimer();
    currentPvlogSourcePath = null;
    currentPvlogOriginalPath = null;
    pvlogEditorLoading = false;

    if (editorRow) editorRow.style.display = 'none';
    if (editorFields) editorFields.style.display = 'none';
    clearPvlogEditorFields();
    setPvlogEditorStatus('');
}

function showPvlogEditorLayout() {
    const editorRow = document.getElementById('pvLoggerEditorRow');
    const editorFields = document.getElementById('pvLoggerEditorFields');

    if (editorFields) editorFields.style.display = '';
    if (editorRow) editorRow.style.display = '';
}

function loadPvlogEditor(path) {
    if (!path) return;

    clearPvlogAutoSaveTimer();
    currentPvlogSourcePath = path;
    pvlogEditorLoading = true;
    showPvlogEditorLayout();
    clearPvlogEditorFields();
    setPvlogEditorStatus('Loading...');

    fetch(`/api/v1/read_pvlog_file?path=${encodeURIComponent(path)}`)
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                throw new Error(result.error || 'Unable to read PVLogger file');
            }

            currentPvlogSourcePath = result.path;
            currentPvlogOriginalPath = result.can_overwrite_original ? result.path : null;

            populatePvlogEditor(result.parsed);
            setPvlogEditorStatus('Loaded');
        })
        .catch(error => {
            console.error('PVLogger read error:', error);
            showNotification('error', error.message || 'Unable to read PVLogger file');
            hidePvlogEditor();
        })
        .finally(() => {
            pvlogEditorLoading = false;
        });
}

function preparePvlogQueueCopy(options = {}) {
    const editorRow = document.getElementById('pvLoggerEditorRow');
    const hiddenInput = document.getElementById('pvLoggerPathValue');
    const esafNumber = document.getElementById('experimentNumber')?.value;

    if (!editorRow || editorRow.style.display === 'none' || !currentPvlogSourcePath) {
        return Promise.resolve();
    }

    if (!esafNumber) {
        const message = 'ESAF number is required to save PVLogger configuration';
        if (!options.silent) showNotification('error', message);
        return Promise.reject(new Error(message));
    }

    if (!options.silent) {
        setPvlogEditorStatus('Preparing copy...');
    }

    return flushPvlogOriginalSave()
        .catch(error => {
            if (!options.silent) {
                showNotification('error', error.message || 'Unable to save PVLogger file before queueing');
            }
            throw error;
        })
        .then(() => fetch('/api/v1/save_pvlog_file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source_path: currentPvlogSourcePath,
                parsed: collectPvlogEditorData(),
                esaf_number: esafNumber,
                action: 'copy_to_uploads',
            }),
        }))
        .then(response => response.json())
        .then(result => {
            if (!result.success) {
                throw new Error(result.error || 'Unable to save PVLogger copy');
            }

            if (hiddenInput) hiddenInput.value = result.path;

            if (!options.silent) {
                setPvlogEditorStatus('Copy ready for queue', 'is-saved');
            }

            return result;
        })
        .catch(error => {
            console.error('PVLogger queue copy error:', error);
            if (!options.silent) {
                setPvlogEditorStatus('Save failed', 'is-dirty');
                showNotification('error', error.message || 'Unable to save PVLogger copy');
            }
            throw error;
        });
}

function initializePvlogEditorWidgets() {
    const addInstrumentBtn = document.getElementById('pvlogAddInstrumentBtn');
    const addPvBtn = document.getElementById('pvlogAddPvBtn');

    if (addInstrumentBtn) {
        addInstrumentBtn.addEventListener('click', () => {
            const list = document.getElementById('pvlogInstrumentsList');
            if (!list) return;
            list.appendChild(createInstrumentRow());
            list.lastElementChild?.querySelector('input')?.focus();
            markPvlogEditorDirty();
        });
    }

    if (addPvBtn) {
        addPvBtn.addEventListener('click', () => {
            const body = document.getElementById('pvlogPvsBody');
            if (!body) return;
            body.appendChild(createPvRow());
            body.lastElementChild?.querySelector('input')?.focus();
            markPvlogEditorDirty();
        });
    }

    document.querySelectorAll('#pvLoggerEditorFields .pvlog-field').forEach(field => {
        field.addEventListener('input', markPvlogEditorDirty);
    });
}
