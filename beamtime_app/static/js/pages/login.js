/* ----------------------------------------------------------------------------------
 * Project: BeamtimeApp
 * File: beamtime_app/static/src/pages/login.ts
 * ----------------------------------------------------------------------------------
 * Purpose:
 * This file handles login page functionality including form validation,
 * submission, and user feedback.
 * ----------------------------------------------------------------------------------
 * Author: Christofanis Skordas
 *
 * Copyright (C) 2025-2026 GSECARS, The University of Chicago, USA
 * Copyright (C) 2025-2026 NSF SEES, USA
 * ---------------------------------------------------------------------------------- */
import { ALERT_TYPES, ALERT_AUTO_DISMISS_DELAY } from '../utils/constants.js';
import { escapeHtml } from '../utils/dom.js';
/**
 * Shows an alert message to the user
 */
function showAlert(message, type = ALERT_TYPES.INFO) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    // Map alert types to Bootstrap classes and icons
    const typeConfig = {
        [ALERT_TYPES.ERROR]: { class: 'danger', icon: 'exclamation-triangle' },
        [ALERT_TYPES.SUCCESS]: { class: 'success', icon: 'check-circle' },
        [ALERT_TYPES.INFO]: { class: 'info', icon: 'info-circle' },
        [ALERT_TYPES.WARNING]: { class: 'warning', icon: 'exclamation-triangle' }
    };
    const config = typeConfig[type] || typeConfig[ALERT_TYPES.INFO];
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${config.class} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        <i class="bi bi-${config.icon} me-2"></i>
        ${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    // Insert alert
    const loginBody = document.querySelector('.login-body');
    const loginForm = document.getElementById('loginForm');
    if (loginBody && loginForm) {
        loginBody.insertBefore(alertDiv, loginForm);
        // Auto-dismiss after delay
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, ALERT_AUTO_DISMISS_DELAY);
    }
}
/**
 * Validates login form inputs
 */
function validateLoginForm(username, password) {
    if (!username || !password) {
        showAlert('Please enter both username and password', ALERT_TYPES.ERROR);
        return false;
    }
    return true;
}
/**
 * Sets the loading state on the login button
 */
function setLoginButtonLoading(button, isLoading) {
    if (!button)
        return;
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    }
    else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}
/**
 * Handles form submission
 */
function handleFormSubmit(event, form, button) {
    event.preventDefault();
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (!usernameInput || !passwordInput) {
        console.error('Login form inputs not found');
        return;
    }
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!validateLoginForm(username, password)) {
        return;
    }
    // Show loading state
    setLoginButtonLoading(button, true);
    // Submit the form - let the server handle redirects
    form.submit();
}
/**
 * Initializes the login page functionality
 */
function initializeLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    // Only run if we're on the login page
    if (!loginForm)
        return;
    // Focus on username field if it exists
    if (usernameInput) {
        usernameInput.focus();
    }
    // Handle form submission
    loginForm.addEventListener('submit', (e) => {
        handleFormSubmit(e, loginForm, loginBtn);
    });
    // Handle Enter key in password field (redundant but provides better UX)
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
        });
    }
}
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeLoginPage);
//# sourceMappingURL=login.js.map