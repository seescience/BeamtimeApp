(function () {
    const searchInput = document.getElementById('usersSearchInput');
    const rows = document.querySelectorAll('#usersTableBody .user-row');
    const countEl = document.getElementById('usersVisibleCount');

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const q = this.value.toLowerCase();
            let visible = 0;
            rows.forEach(row => {
                const match = !q || row.textContent.toLowerCase().includes(q);
                row.hidden = !match;
                if (match) visible++;
            });
            countEl.textContent = visible;
        });
    }

    document.addEventListener('change', function (e) {
        const cb = e.target.closest('.staff-toggle-check');
        if (!cb) return;

        const personId = parseInt(cb.dataset.personId, 10);
        const isStaff = cb.checked;
        cb.disabled = true;

        fetch(`/api/v1/persons/${personId}/staff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_staff: isStaff }),
        })
        .then(r => r.json())
        .then(data => {
            if (data.error) {
                cb.checked = !isStaff;
            }
            cb.disabled = false;
        })
        .catch(() => {
            cb.checked = !isStaff;
            cb.disabled = false;
        });
    });
})();
