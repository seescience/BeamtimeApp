(function () {
    const searchInput = document.getElementById('usersSearchInput');
    const rows = document.querySelectorAll('#usersTableBody .user-row');
    const countEl = document.getElementById('usersVisibleCount');

    if (!searchInput) return;

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
})();
