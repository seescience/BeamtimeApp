/* ----------------------------------------------------------------------------------
 * Project: BeamtimeApp
 * File: beamtime_app/static/src/utils/notifications.ts
 * ----------------------------------------------------------------------------------
 * Purpose:
 * This file provides notification and alert utilities using Bootstrap toast
 * components for user feedback.
 * ----------------------------------------------------------------------------------
 * Author: Christofanis Skordas
 *
 * Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
 * Copyright (C) 2025-2026 NSF SEES, USA
 * ---------------------------------------------------------------------------------- */
import { NOTIFICATION_TYPES, TOAST_DELAY } from './constants.js';
import { escapeHtml } from './dom.js';
/**
 * Shows a notification using Bootstrap toast
 */
export function showNotification(type, message) {
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
    const toastId = `toast-${Date.now()}`;
    // Map types to Bootstrap classes and icons
    const typeConfig = {
        [NOTIFICATION_TYPES.SUCCESS]: { class: 'text-bg-success', icon: 'bi-check-circle-fill' },
        [NOTIFICATION_TYPES.ERROR]: { class: 'text-bg-danger', icon: 'bi-exclamation-triangle-fill' },
        [NOTIFICATION_TYPES.WARNING]: { class: 'text-bg-warning', icon: 'bi-exclamation-triangle-fill' },
        [NOTIFICATION_TYPES.INFO]: { class: 'text-bg-info', icon: 'bi-info-circle-fill' }
    };
    const config = typeConfig[type] || typeConfig[NOTIFICATION_TYPES.INFO];
    // Escape HTML to prevent XSS
    const escapedMessage = escapeHtml(message);
    // Create toast HTML
    const toastHTML = `
        <div id="${toastId}" class="toast ${config.class}" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${TOAST_DELAY}">
            <div class="toast-header ${config.class}">
                <i class="bi ${config.icon} me-2"></i>
                <strong class="me-auto text-capitalize">${escapeHtml(type)}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${escapedMessage}
            </div>
        </div>
    `;
    // Add toast to container
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    // Initialize and show toast
    const toastElement = document.getElementById(toastId);
    if (!toastElement) {
        console.error('Failed to create toast element');
        return;
    }
    // Use Bootstrap Toast (assuming bootstrap is available globally)
    const Bootstrap = window.bootstrap;
    if (Bootstrap && Bootstrap.Toast) {
        const toast = new Bootstrap.Toast(toastElement);
        toast.show();
        // Remove toast from DOM after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
}
//# sourceMappingURL=notifications.js.map