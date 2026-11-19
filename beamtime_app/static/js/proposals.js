(function () {
    const searchInput = document.getElementById('proposalsSearchInput');
    const countEl = document.getElementById('proposalsVisibleCount');
    const listView = document.getElementById('proposalsListView');
    const detailView = document.getElementById('proposalDetailView');
    const panel = document.querySelector('.dash-panel');
    const backBtn = document.getElementById('backToProposalsBtn');

    function getRows() {
        return document.querySelectorAll('#proposalsTableBody .proposal-row');
    }

    // Search
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const q = this.value.toLowerCase();
            let visible = 0;
            getRows().forEach(row => {
                const match = !q || row.textContent.toLowerCase().includes(q);
                row.hidden = !match;
                if (match) visible++;
            });
            if (countEl) countEl.textContent = visible;
        });
    }

    function openDetail(proposal) {
        const titleEl = document.getElementById('proposalDetailTitle');
        if (titleEl) titleEl.textContent = proposal.title || '';

        const numEl = document.getElementById('proposalDetailNumber');
        if (numEl) numEl.textContent = proposal.id || '';

        setDetailProp('proposalDetailStatus', proposal.status);
        setDetailProp('proposalDetailCall', proposal.proposal_call);
        setDetailProp('proposalDetailType', proposal.proposal_type);
        setDetailProp('proposalDetailPi', proposal.pi_name);
        setDetailProp('proposalDetailCoPi', proposal.co_pi);
        setDetailProp('proposalDetailPrimaryArea', proposal.primary_area);
        setDetailProp('proposalDetailAdditionalAreas', proposal.additional_areas);
        setDetailProp('proposalDetailReviewPanel', proposal.review_panel);
        setDetailProp('proposalDetailRunCycle', proposal.run_cycle);
        setDetailProp('proposalDetailSubmitted',
            proposal.submitted_date ? new Date(proposal.submitted_date).toLocaleDateString() : null);
        setDetailProp('proposalDetailBeamlines', proposal.beamlines);

        if (proposal.pdf_file && !isBlank(proposal.pdf_file)) {
            const pdfUrl = `/api/v1/serve_pdf?path=${encodeURIComponent(proposal.pdf_file)}`;
            setDetailProp('proposalDetailPdf', `<a href="${pdfUrl}" target="_blank">View PDF</a>`, true);
        } else {
            setDetailProp('proposalDetailPdf', null);
        }

        const experimentsBody = document.getElementById('proposalExperimentsBody');
        if (experimentsBody) {
            experimentsBody.innerHTML = '';
            const exps = proposal.experiments || [];
            if (exps.length === 0) {
                experimentsBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted small py-3">No experiments</td></tr>';
            } else {
                exps.forEach(e => {
                    const tr = document.createElement('tr');
                    tr.style.cursor = 'pointer';
                    const start = e.start_date ? new Date(e.start_date).toLocaleDateString() : '';
                    const end = e.end_date ? new Date(e.end_date).toLocaleDateString() : '';
                    tr.innerHTML = `<td class="small font-monospace">${e.etr_number || ''}</td><td class="small font-monospace">${e.id}</td><td class="small">${e.beamline_name}</td><td class="small">${start}</td><td class="small">${end}</td><td class="small text-center">${e.time_request != null ? e.time_request : ''}</td>`;
                    tr.addEventListener('click', function () {
                        window.location.href = `/api/v1/experiments/${e.id}`;
                    });
                    experimentsBody.appendChild(tr);
                });
            }
        }

        const fundingBody = document.getElementById('proposalFundingBody');
        if (fundingBody) {
            fundingBody.innerHTML = '';
            const sources = proposal.funding || [];
            if (sources.length === 0) {
                fundingBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted small py-3">No funding sources</td></tr>';
            } else {
                sources.forEach(f => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td class="small">${f.source || ''}</td><td class="small">${f.details || ''}</td><td class="small font-monospace">${f.grant_number || ''}</td><td class="small text-center">${f.percentage != null ? f.percentage + '%' : ''}</td>`;
                    fundingBody.appendChild(tr);
                });
            }
        }

        const propUrl = `/api/v1/proposals/${proposal.id}`;
        if (window.location.pathname === propUrl) {
            history.replaceState({ proposalDetail: true }, '', propUrl);
        } else {
            history.pushState({ proposalDetail: true }, '', propUrl);
        }
        if (listView) listView.hidden = true;
        if (detailView) detailView.hidden = false;
        if (panel) panel.classList.add('panel-has-detail');
    }

    function closeDetail() {
        if (detailView) detailView.hidden = true;
        if (listView) listView.hidden = false;
        if (panel) panel.classList.remove('panel-has-detail');
        getRows().forEach(r => r.classList.remove('row-active'));
    }

    window.addEventListener('popstate', function () {
        if (detailView && !detailView.hidden) {
            closeDetail();
        }
    });

    // Row click
    document.addEventListener('click', function (e) {
        const row = e.target.closest('#proposalsTableBody .proposal-row');
        if (!row) return;
        const data = JSON.parse(row.dataset.proposalData || '{}');
        getRows().forEach(r => r.classList.remove('row-active'));
        row.classList.add('row-active');
        openDetail(data);
    });

    // Back button
    if (backBtn) backBtn.addEventListener('click', closeDetail);

    // Auto-open proposal when loaded at a dedicated proposal URL
    document.addEventListener('DOMContentLoaded', function () {
        if (window._openProposalId) {
            const row = document.querySelector(`tr.proposal-row[data-proposal-id="${window._openProposalId}"]`);
            if (row) {
                const data = JSON.parse(row.dataset.proposalData || '{}');
                row.classList.add('row-active');
                openDetail(data);
            }
        }
    });
})();
