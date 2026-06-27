const API = `${window.location.protocol}//${window.location.hostname}:8000`;
const DEFAULT_ICON = '/default-icon.png';
const typeLabels = { bank: 'Банк', sbp: 'СБП', card: 'Карта' };
const periodLabels = { month: 'Месяц', year: 'Год', week: 'Неделя' };

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// --- Navigation ---
function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageName);
    if (target) target.classList.add('active');

    document.querySelectorAll('[data-page]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`[data-page="${pageName}"]`).forEach(b => b.classList.add('active'));

    if (loaders[pageName]) loaders[pageName]();
}

document.addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if (btn) switchPage(btn.dataset.page);
});

// --- Helpers ---
async function api(path, opts = {}) {
    const res = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
    if (!res.ok && res.status !== 204) throw await res.json();
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}
const fmt = n => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(n);
const empty = (icon, text) => `<div class="empty-state"><i class="${icon}"></i><p>${text}</p></div>`;
const iconImg = url => `<img src="${url || DEFAULT_ICON}" class="sub-icon">`;

// --- Modal ---
const overlay = document.getElementById('modalOverlay');
document.getElementById('modalCancel').onclick = () => overlay.classList.remove('open');
overlay.onclick = e => { if (e.target === overlay) overlay.classList.remove('open'); };

function openModal(title, bodyHtml, onSave) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    document.getElementById('modalSave').onclick = async () => {
        const inputs = document.querySelectorAll('#modalBody input[required], #modalBody select[required]');
        for (const inp of inputs) {
            if (!inp.value || (inp.type === 'number' && !parseFloat(inp.value))) {
                inp.focus();
                inp.style.borderColor = 'var(--danger)';
                setTimeout(() => inp.style.borderColor = '', 2000);
                return;
            }
        }
        await onSave();
        overlay.classList.remove('open');
    };
    overlay.classList.add('open');
}

// --- Dashboard ---
async function loadDashboard() {
    const [est, counts, total, byCat, upcoming] = await Promise.all([
        api('/analytics/estimates'), api('/analytics/subscriptions/count'),
        api('/analytics/total-spent'), api('/analytics/by-category'), api('/analytics/upcoming?days=7')
    ]);

    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card">
            <div class="label"><i class="fa-solid fa-wallet"></i> Потрачено всего</div>
            <div class="value">${fmt(total.total_spent)}</div>
            <div class="sub">Общая сумма всех оплаченных платежей за всё время использования сервиса</div>
        </div>
        <div class="stat-card">
            <div class="label"><i class="fa-solid fa-calendar-days"></i> Планируемый расход в месяц</div>
            <div class="value">${fmt(est.monthly_estimate)}</div>
            <div class="sub">Ориентировочная ежемесячная сумма на основе текущих активных подписок</div>
        </div>
        <div class="stat-card">
            <div class="label"><i class="fa-solid fa-calendar-check"></i> Планируемый расход в год</div>
            <div class="value">${fmt(est.yearly_estimate)}</div>
            <div class="sub">Прогноз годовых трат при сохранении текущего набора активных подписок</div>
        </div>
        <div class="stat-card">
            <div class="label"><i class="fa-solid fa-list-check"></i> Подписки</div>
            <div class="value">${counts.active} / ${counts.inactive}</div>
            <div class="sub">Количество активных и неактивных подписок в системе</div>
        </div>`;

    // График по категориям с процентами
    const totalCatSpent = byCat.reduce((sum, c) => sum + c.spent, 0) || 1;
    document.getElementById('categoryChart').innerHTML = byCat.length ? byCat.map(c => {
        const pct = ((c.spent / totalCatSpent) * 100).toFixed(1);
        return `
        <div class="bar-row">
            <div class="bar-label"><span class="color-dot" style="background:${c.color}"></span>${c.name}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${c.color}"></div></div>
            <div class="bar-value">${fmt(c.spent)} (${pct}%)</div>
        </div>`;
    }).join('') : empty('fa-chart-bar', 'Нет данных по категориям');

    // Ближайшие платежи с иконками
    document.getElementById('upcomingTable').innerHTML = !upcoming.length ? empty('fa-calendar-check', 'Нет ближайших платежей на 7 дней') :
        `<table><thead><tr><th>Подписка</th><th>Дата</th><th>Сумма</th></tr></thead><tbody>${upcoming.map(u => `<tr><td>${iconImg(u.icon_url)}${u.name}</td><td>${u.next_payment_date}</td><td>${fmt(u.cost)}</td></tr>`).join('')}</tbody></table>`;
}

// --- Subscriptions ---
async function loadSubscriptions() {
    const [subs, cats, methods] = await Promise.all([api('/subscriptions'), api('/categories'), api('/payment-methods')]);
    window._cats = cats; window._methods = methods;
    if (!subs.length) { document.getElementById('subsTable').innerHTML = empty('fa-star', 'Нет подписок'); return; }
    document.getElementById('subsTable').innerHTML = `<table><thead><tr><th>Название</th><th>Категория</th><th>Способ оплаты</th><th>Стоимость</th><th>Период</th><th>След. платёж</th><th>Статус</th><th>Действия</th></tr></thead><tbody>
        ${subs.map(s => { const c = cats.find(x => x.id === s.category_id); const pm = methods.find(x => x.id === s.payment_method_id); return `<tr>
            <td>${iconImg(s.icon_url)}${s.name}</td>
            <td>${c ? `<span class="color-dot" style="background:${c.color}"></span>${c.name}` : '—'}</td>
            <td>${pm ? `${typeLabels[pm.type] || pm.type} — ${pm.name}` : '—'}</td>
            <td>${fmt(s.cost)}</td>
            <td>${periodLabels[s.period] || s.period}</td>
            <td>${s.next_payment_date}</td>
            <td>${s.is_active ? '<span class="badge badge-paid">Активна</span>' : '<span class="badge badge-cancelled">Неактивна</span>'}</td>
            <td>
                <button class="btn btn-outline" style="padding:6px 10px;" onclick="editSub(${s.id})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger" style="padding:6px 10px;" onclick="delSub(${s.id})"><i class="fa-solid fa-trash"></i></button>
                <button class="btn btn-outline" style="padding:6px 10px;" onclick="subStats(${s.id})"><i class="fa-solid fa-chart-bar"></i></button>
            </td></tr>`; }).join('')}</tbody></table>`;
}
window.delSub = async id => { if (confirm('Удалить?')) { await api(`/subscriptions/${id}`, { method: 'DELETE' }); loadSubscriptions(); } };
window.subStats = async id => {
    const d = await api(`/analytics/subscriptions/${id}`);
    const s = d.subscription;
    openModal('', `
        <div class="stats-modal-header">
            ${iconImg(s.icon_url)}
            <h3>${s.name}</h3>
        </div>
        <div class="stats-modal-grid">
            <div class="stats-modal-card">
                <div class="sm-label">Всего платежей</div>
                <div class="sm-value">${d.total_payments}</div>
            </div>
            <div class="stats-modal-card">
                <div class="sm-label">Потрачено</div>
                <div class="sm-value">${fmt(d.total_spent)}</div>
            </div>
            <div class="stats-modal-card">
                <div class="sm-label">Стоимость</div>
                <div class="sm-value">${fmt(s.cost)}</div>
            </div>
            <div class="stats-modal-card">
                <div class="sm-label">Период</div>
                <div class="sm-value">${periodLabels[s.period] || s.period}</div>
            </div>
        </div>
        <div class="stats-modal-status ${s.is_active ? 'active' : 'inactive'}">
            ${s.is_active ? 'Подписка активна' : 'Подписка неактивна'}
        </div>
    `, () => overlay.classList.remove('open'));
    document.getElementById('modalSave').textContent = 'Закрыть';
};
window.editSub = async id => { const subs = await api('/subscriptions'); openSubForm(subs.find(s => s.id === id)); };
document.getElementById('addSubBtn').onclick = () => openSubForm(null);

async function openSubForm(data) {
    const [cats, methods] = await Promise.all([window._cats || api('/categories'), window._methods || api('/payment-methods')]);
    if (!cats.length || !methods.length) { alert('Сначала создайте хотя бы одну категорию и один способ оплаты'); return; }
    openModal(data ? 'Редактировать подписку' : 'Новая подписка', `
        <div class="form-group"><label>Название *</label><input id="f_name" required value="${data?.name || ''}"></div>
        <div class="form-group"><label>URL иконки</label><input id="f_icon" placeholder="Оставьте пустым для стандартной иконки" value="${data?.icon_url || ''}"></div>
        <div class="form-group"><label>Стоимость *</label><input id="f_cost" type="number" step="0.01" required value="${data?.cost || ''}"></div>
        <div class="form-group"><label>Период *</label><select id="f_period" required><option value="month" ${data?.period === 'month' ? 'selected' : ''}>Месяц</option><option value="year" ${data?.period === 'year' ? 'selected' : ''}>Год</option><option value="week" ${data?.period === 'week' ? 'selected' : ''}>Неделя</option></select></div>
        <div class="form-group"><label>Дата след. платежа *</label><input id="f_next" type="date" required value="${data?.next_payment_date || ''}"></div>
        <div class="form-group"><label>Категория *</label><select id="f_cat" required><option value="">Выберите категорию</option>${cats.map(c => `<option value="${c.id}" ${data?.category_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Способ оплаты *</label><select id="f_pm" required><option value="">Выберите способ</option>${methods.map(m => `<option value="${m.id}" ${data?.payment_method_id === m.id ? 'selected' : ''}>${typeLabels[m.type]} — ${m.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Активна *</label><select id="f_active" required><option value="true" ${data?.is_active !== false ? 'selected' : ''}>Да</option><option value="false" ${data?.is_active === false ? 'selected' : ''}>Нет</option></select></div>`,
        async () => {
            const body = { name: document.getElementById('f_name').value, icon_url: document.getElementById('f_icon').value || null, cost: parseFloat(document.getElementById('f_cost').value), period: document.getElementById('f_period').value, next_payment_date: document.getElementById('f_next').value, category_id: parseInt(document.getElementById('f_cat').value), payment_method_id: parseInt(document.getElementById('f_pm').value), is_active: document.getElementById('f_active').value === 'true' };
            if (data) await api(`/subscriptions/${data.id}`, { method: 'PUT', body }); else await api('/subscriptions', { method: 'POST', body });
            loadSubscriptions();
        });
}

// --- Payments ---
let paymentsState = { page: 1, perPage: 20, filterSub: '' };

async function loadPayments() {
    const [allPayments, subs] = await Promise.all([api('/payments'), api('/subscriptions')]);
    window._subsList = subs;

    let filtered = allPayments;
    if (paymentsState.filterSub) {
        filtered = allPayments.filter(p => p.subscription_id === parseInt(paymentsState.filterSub));
    }

    filtered.sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return b.id - a.id;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / paymentsState.perPage));
    if (paymentsState.page > totalPages) paymentsState.page = totalPages;
    const start = (paymentsState.page - 1) * paymentsState.perPage;
    const pageItems = filtered.slice(start, start + paymentsState.perPage);

    document.getElementById('paymentsControls').innerHTML = `
        <div class="list-controls">
            <select id="payFilterSub" onchange="paymentsState.filterSub=this.value;paymentsState.page=1;loadPayments();">
                <option value="">Все подписки</option>
                ${subs.map(s => `<option value="${s.id}" ${paymentsState.filterSub == s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
            <div class="per-page-select">
                Показывать по:
                <select onchange="paymentsState.perPage=parseInt(this.value);paymentsState.page=1;loadPayments();">
                    <option value="10" ${paymentsState.perPage===10?'selected':''}>10</option>
                    <option value="20" ${paymentsState.perPage===20?'selected':''}>20</option>
                    <option value="50" ${paymentsState.perPage===50?'selected':''}>50</option>
                    <option value="100" ${paymentsState.perPage===100?'selected':''}>100</option>
                </select>
            </div>
        </div>`;

    if (!pageItems.length) {
        document.getElementById('paymentsTable').innerHTML = empty('fa-receipt', paymentsState.filterSub ? 'Нет платежей по выбранной подписке' : 'Нет платежей');
        document.getElementById('paymentsPagination').innerHTML = '';
        return;
    }

    document.getElementById('paymentsTable').innerHTML = `<table><thead><tr><th>Дата</th><th>Подписка</th><th>Сумма</th><th>Статус</th><th>Действия</th></tr></thead><tbody>
        ${pageItems.map(p => {
            const s = subs.find(x => x.id === p.subscription_id);
            return `<tr><td>${p.date}</td><td>${s ? iconImg(s.icon_url) + s.name : 'Удалена'}</td><td>${fmt(p.amount)}</td>
                <td><span class="badge ${p.status === 'paid' ? 'badge-paid' : 'badge-cancelled'}">${p.status === 'paid' ? 'Оплачено' : 'Отменено'}</span></td>
                <td>${p.status === 'paid' ? `<button class="btn btn-danger" style="padding:6px 10px;" onclick="cancelPay(${p.id})"><i class="fa-solid fa-ban"></i></button>` : ''}</td></tr>`;
        }).join('')}</tbody></table>`;

    document.getElementById('paymentsPagination').innerHTML = `
        <div class="pagination">
            <button class="btn btn-outline" ${paymentsState.page <= 1 ? 'disabled' : ''} onclick="paymentsState.page--;loadPayments();"><i class="fa-solid fa-chevron-left"></i></button>
            <span class="page-info">Стр. ${paymentsState.page} из ${totalPages} (${total} записей)</span>
            <button class="btn btn-outline" ${paymentsState.page >= totalPages ? 'disabled' : ''} onclick="paymentsState.page++;loadPayments();"><i class="fa-solid fa-chevron-right"></i></button>
        </div>`;
}

window.cancelPay = async id => { if (confirm('Отменить?')) { await api(`/payments/${id}/cancel`, { method: 'PATCH' }); loadPayments(); } };

document.getElementById('checkPayBtn').onclick = async () => {
    paymentsState.page = 1;
    const r = await api('/check-payments', { method: 'POST' });
    if (r.created_payments.length > 0) {
        showToast(`Создано платежей: ${r.created_payments.length}`, 'success');
    } else {
        showToast('Нет новых платежей для создания', 'info');
    }
    loadPayments();
};

// --- Categories ---
async function loadCategories() {
    const cats = await api('/categories');
    if (!cats.length) { document.getElementById('catsTable').innerHTML = empty('fa-tags', 'Нет категорий'); return; }
    document.getElementById('catsTable').innerHTML = `<table><thead><tr><th>Цвет</th><th>Название</th><th>Действия</th></tr></thead><tbody>
        ${cats.map(c => `<tr><td><span class="color-dot" style="background:${c.color}"></span>${c.color}</td><td>${c.name}</td>
            <td><button class="btn btn-outline" style="padding:6px 10px;" onclick='editCat(${JSON.stringify(c)})'><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-danger" style="padding:6px 10px;" onclick="delCat(${c.id})"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}</tbody></table>`;
}
window.delCat = async id => { if (confirm('Удалить?')) { await api(`/categories/${id}`, { method: 'DELETE' }); loadCategories(); } };
window.editCat = data => openCatForm(data);
document.getElementById('addCatBtn').onclick = () => openCatForm(null);
function openCatForm(data) {
    openModal(data ? 'Редактировать категорию' : 'Новая категория', `
        <div class="form-group"><label>Название *</label><input id="f_cn" required value="${data?.name || ''}"></div>
        <div class="form-group"><label>Цвет *</label><input id="f_cc" type="color" required value="${data?.color || '#bb86fc'}" style="height:42px;"></div>`,
        async () => { const body = { name: document.getElementById('f_cn').value, color: document.getElementById('f_cc').value }; if (data) await api(`/categories/${data.id}`, { method: 'PUT', body }); else await api('/categories', { method: 'POST', body }); loadCategories(); });
}

// --- Payment Methods ---
async function loadMethods() {
    const methods = await api('/payment-methods');
    if (!methods.length) { document.getElementById('methodsTable').innerHTML = empty('fa-credit-card', 'Нет способов'); return; }
    document.getElementById('methodsTable').innerHTML = `<table><thead><tr><th>Тип</th><th>Название</th><th>Действия</th></tr></thead><tbody>
        ${methods.map(m => `<tr><td>${typeLabels[m.type] || m.type}</td><td>${m.name}</td>
            <td><button class="btn btn-outline" style="padding:6px 10px;" onclick='editMethod(${JSON.stringify(m)})'><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-danger" style="padding:6px 10px;" onclick="delMethod(${m.id})"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}</tbody></table>`;
}
window.delMethod = async id => { if (confirm('Удалить?')) { await api(`/payment-methods/${id}`, { method: 'DELETE' }); loadMethods(); } };
window.editMethod = data => openMethodForm(data);
document.getElementById('addMethodBtn').onclick = () => openMethodForm(null);
function openMethodForm(data) {
    openModal(data ? 'Редактировать способ' : 'Новый способ', `
        <div class="form-group"><label>Тип *</label><select id="f_mt" required><option value="bank" ${data?.type === 'bank' ? 'selected' : ''}>Банк</option><option value="sbp" ${data?.type === 'sbp' ? 'selected' : ''}>СБП</option><option value="card" ${data?.type === 'card' ? 'selected' : ''}>Карта</option></select></div>
        <div class="form-group"><label>Название *</label><input id="f_mn" required value="${data?.name || ''}"></div>`,
        async () => { const body = { type: document.getElementById('f_mt').value, name: document.getElementById('f_mn').value }; if (data) await api(`/payment-methods/${data.id}`, { method: 'PUT', body }); else await api('/payment-methods', { method: 'POST', body }); loadMethods(); });
}

const loaders = { dashboard: loadDashboard, subscriptions: loadSubscriptions, payments: loadPayments, categories: loadCategories, methods: loadMethods };
loadDashboard();