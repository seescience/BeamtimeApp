(function () {
    const searchInput = document.getElementById('proposalsSearchInput');
    const rows = document.querySelectorAll('#proposalsTableBody .proposal-row');
    const countEl = document.getElementById('proposalsVisibleCount');

    if (!searchInput) return;

    searchInput.addEventListener('input', function () {
        const q = this.value.toLowerCase();
        let visible = 0;
        rows.forEach(row => {
            const match = !q || row.textContent.toLowerCase().includes(q);
            row.hidden = !match;
            if (match) visible++;
        });
        if (countEl) countEl.textContent = visible;
    });
})();
