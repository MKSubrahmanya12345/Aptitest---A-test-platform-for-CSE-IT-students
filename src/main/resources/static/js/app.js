'use strict';
(() => {
    try { document.documentElement.dataset.theme = localStorage.getItem('aptitest-theme') || 'light'; } catch (_) { /* Storage is optional. */ }
    document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => {
        const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = theme;
        try { localStorage.setItem('aptitest-theme', theme); } catch (_) { /* Private browsing. */ }
    }));
    const menuButton = document.querySelector('[data-menu-toggle]');
    menuButton?.addEventListener('click', () => {
        const open = document.querySelector('#sidebar').classList.toggle('open');
        menuButton.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', event => {
        const sidebar = document.querySelector('#sidebar');
        if (sidebar?.classList.contains('open') && !sidebar.contains(event.target) && !menuButton?.contains(event.target)) {
            sidebar.classList.remove('open'); menuButton?.setAttribute('aria-expanded', 'false');
        }
    });
    document.querySelectorAll('[data-password-toggle]').forEach(button => button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.passwordToggle);
        const showing = input.type === 'password'; input.type = showing ? 'text' : 'password';
        button.textContent = showing ? 'Hide' : 'Show'; button.setAttribute('aria-pressed', String(showing));
    }));
    document.querySelectorAll('form[data-confirm]').forEach(form => form.addEventListener('submit', event => {
        if (!window.confirm(form.dataset.confirm)) event.preventDefault();
    }));
    document.querySelectorAll('[data-print]').forEach(button => button.addEventListener('click', () => window.print()));

    const answerForm = document.querySelector('[data-answer-form]');
    if (answerForm) {
        const status = document.querySelector('[data-save-status]');
        let timeout, activeSave = Promise.resolve(), ending = false;
        const setStatus = (text, error = false) => { status.textContent = text; status.classList.toggle('failed', error); };
        const save = () => {
            clearTimeout(timeout);
            const body = new URLSearchParams(new FormData(answerForm));
            activeSave = activeSave.catch(() => {}).then(async () => {
                setStatus('Saving…');
                try {
                    const response = await fetch(answerForm.dataset.autosave, { method: 'POST', headers: { 'Accept': 'application/json' }, body, credentials: 'same-origin' });
                    if (!response.ok) {
                        const result = await response.json().catch(() => ({}));
                        throw new Error(result.message || 'Could not save. Check your connection or sign in again.');
                    }
                    const result = await response.json();
                    if (result.completed) { ending = true; window.location.assign(answerForm.dataset.result); return; }
                    setStatus('All changes saved');
                    const position = answerForm.elements.position.value;
                    const nav = document.querySelector(`[data-question-number="${position}"]`);
                    const values = body.getAll('answer').filter(value => value.trim() !== '');
                    nav?.classList.toggle('answered', values.length > 0);
                    nav?.classList.toggle('flagged', body.get('flagged') === 'true');
                } catch (error) { setStatus(error.message, true); throw error; }
            });
            return activeSave;
        };
        answerForm.addEventListener('submit', event => {
            if (event.submitter?.value === 'finish' && !window.confirm('Save your answer and submit this test?')) event.preventDefault();
        });
        answerForm.addEventListener('change', () => { save().catch(() => {}); });
        answerForm.addEventListener('input', event => {
            if (event.target.type === 'text' || event.target.tagName === 'TEXTAREA') {
                setStatus('Unsaved changes'); clearTimeout(timeout); timeout = setTimeout(() => save().catch(() => {}), 550);
            }
        });
        answerForm.addEventListener('reset', () => setTimeout(() => { save().catch(() => {}); }, 0));
        document.querySelectorAll('[data-test-navigation]').forEach(link => link.addEventListener('click', async event => {
            event.preventDefault();
            try { await save(); if (!ending) window.location.assign(link.href); } catch (_) { /* Keep the unsaved answer visible. */ }
        }));
        document.querySelector('[data-clear-answer]')?.addEventListener('click', () => {
            answerForm.querySelectorAll('[name="answer"]').forEach(input => {
                if (input.type === 'radio' || input.type === 'checkbox') input.checked = false; else input.value = '';
            });
            save().catch(() => {});
        });
        const finishForm = document.querySelector('[data-finish-form]');
        const finish = async (expired = false) => {
            if (ending) return;
            if (!expired && !window.confirm('Submit this test? You cannot change answers after submitting.')) return;
            ending = true;
            try { await save(); } catch (_) { if (!expired) { ending = false; return; } }
            HTMLFormElement.prototype.submit.call(finishForm);
        };
        finishForm?.addEventListener('submit', event => { event.preventDefault(); finish(false); });
        const timer = document.querySelector('[data-deadline]');
        const deadline = Date.parse(timer.dataset.deadline);
        const update = () => {
            const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            const mins = Math.floor(seconds / 60), secs = seconds % 60;
            timer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            timer.parentElement.classList.toggle('urgent', seconds < 60);
            if (seconds <= 0) finish(true);
        };
        update(); const ticker = setInterval(update, 1000);
        window.addEventListener('pagehide', () => clearInterval(ticker), { once: true });
    }
    const checkout = document.querySelector('[data-razorpay-checkout]');
    checkout?.addEventListener('click', () => {
        const status = document.querySelector('[data-checkout-status]');
        if (typeof window.Razorpay !== 'function') { status.textContent = 'The payment gateway could not load. Check your connection and try again.'; return; }
        const options = {
            key: checkout.dataset.key, amount: Number(checkout.dataset.amount), currency: 'INR',
            name: 'AptiTest', description: checkout.dataset.description, order_id: checkout.dataset.order,
            prefill: { name: checkout.dataset.name, email: checkout.dataset.email },
            theme: { color: '#156b55' },
            handler: result => {
                const form = document.querySelector('[data-payment-verify]');
                form.elements.paymentId.value = result.razorpay_payment_id;
                form.elements.signature.value = result.razorpay_signature;
                form.elements.orderId.value = result.razorpay_order_id;
                form.submit();
            }
        };
        const payment = new window.Razorpay(options);
        payment.on('payment.failed', () => { status.textContent = 'Payment was not completed. No test access was granted.'; });
        payment.open();
    });
})();
