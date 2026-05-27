/* ============================================
   EXPENSE & BUDGET VISUALIZER - APP
   ============================================ */

// ============================================
// STATE MANAGEMENT
// ============================================
const AppState = {
    transactions: [],
    categories: {
        'Food': '#2ecc71',
        'Transport': '#3498db',
        'Fun': '#e67e22'
    },
    spendingLimit: 500,
    sortBy: 'newest',
    theme: 'light',
    chartInstance: null
};

// ============================================
// DOM ELEMENTS
// ============================================
const DOM = {
    form: document.getElementById('transaction-form'),
    itemName: document.getElementById('item-name'),
    itemAmount: document.getElementById('item-amount'),
    itemCategory: document.getElementById('item-category'),
    transactionsList: document.getElementById('transactions-list'),
    emptyState: document.getElementById('empty-state'),
    totalBalance: document.getElementById('total-balance'),
    sortBy: document.getElementById('sort-by'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),

    // Monthly Summary
    monthlyTotal: document.getElementById('monthly-total'),
    monthlyCount: document.getElementById('monthly-count'),
    monthlyAvg: document.getElementById('monthly-avg'),
    topCategory: document.getElementById('top-category'),

    // Limit
    limitProgress: document.getElementById('limit-progress'),
    limitSpent: document.getElementById('limit-spent'),
    limitTotal: document.getElementById('limit-total'),
    limitAlert: document.getElementById('limit-alert'),
    editLimitBtn: document.getElementById('edit-limit-btn'),
    limitModal: document.getElementById('limit-modal'),
    limitInput: document.getElementById('limit-input'),
    saveLimitBtn: document.getElementById('save-limit-btn'),
    cancelLimitBtn: document.getElementById('cancel-limit-btn'),

    // Custom Category
    toggleCustomCat: document.getElementById('toggle-custom-cat'),
    customCatForm: document.getElementById('custom-cat-form'),
    newCategoryName: document.getElementById('new-category-name'),
    newCategoryColor: document.getElementById('new-category-color'),
    addCategoryBtn: document.getElementById('add-category-btn'),

    // Chart
    chartCanvas: document.getElementById('expense-chart')
};

// ============================================
// LOCAL STORAGE
// ============================================
const Storage = {
    save() {
        const data = {
            transactions: AppState.transactions,
            categories: AppState.categories,
            spendingLimit: AppState.spendingLimit,
            theme: AppState.theme
        };
        localStorage.setItem('expenseVisualizerData', JSON.stringify(data));
    },

    load() {
        try {
            const data = JSON.parse(localStorage.getItem('expenseVisualizerData'));
            if (data) {
                AppState.transactions = data.transactions || [];
                AppState.categories = data.categories || AppState.categories;
                AppState.spendingLimit = data.spendingLimit || 500;
                AppState.theme = data.theme || 'light';
            }
        } catch (e) {
            console.error('Error loading data:', e);
        }
    }
};

// ============================================
// INITIALIZATION
// ============================================
function init() {
    Storage.load();
    applyTheme(AppState.theme);
    updateCategoryOptions();
    renderAll();
    setupEventListeners();
}

function setupEventListeners() {
    // Form submission
    DOM.form.addEventListener('submit', handleAddTransaction);

    // Sort
    DOM.sortBy.addEventListener('change', (e) => {
        AppState.sortBy = e.target.value;
        renderTransactions();
    });

    // Theme toggle
    DOM.themeToggle.addEventListener('click', toggleTheme);

    // Custom category
    DOM.toggleCustomCat.addEventListener('click', () => {
        DOM.customCatForm.classList.toggle('hidden');
    });
    DOM.addCategoryBtn.addEventListener('click', handleAddCustomCategory);

    // Limit modal
    DOM.editLimitBtn.addEventListener('click', () => {
        DOM.limitInput.value = AppState.spendingLimit;
        DOM.limitModal.classList.remove('hidden');
    });
    DOM.saveLimitBtn.addEventListener('click', handleSaveLimit);
    DOM.cancelLimitBtn.addEventListener('click', () => {
        DOM.limitModal.classList.add('hidden');
    });
    DOM.limitModal.addEventListener('click', (e) => {
        if (e.target === DOM.limitModal) {
            DOM.limitModal.classList.add('hidden');
        }
    });

    // Enter key on limit input
    DOM.limitInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSaveLimit();
    });
}

// ============================================
// THEME MANAGEMENT
// ============================================
function applyTheme(theme) {
    AppState.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    DOM.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    updateChartTheme();
}

function toggleTheme() {
    const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    Storage.save();
}

function updateChartTheme() {
    if (AppState.chartInstance) {
        const isDark = AppState.theme === 'dark';
        AppState.chartInstance.options.plugins.legend.labels.color = isDark ? '#e0e0e0' : '#2c3e50';
        AppState.chartInstance.update();
    }
}

// ============================================
// TRANSACTION MANAGEMENT
// ============================================
function handleAddTransaction(e) {
    e.preventDefault();

    const name = DOM.itemName.value.trim();
    const amount = parseFloat(DOM.itemAmount.value);
    const category = DOM.itemCategory.value;

    // Validation
    if (!name || isNaN(amount) || amount <= 0 || !category) {
        alert('Please fill in all fields with valid values.');
        return;
    }

    const transaction = {
        id: Date.now().toString(),
        name,
        amount,
        category,
        date: new Date().toISOString()
    };

    AppState.transactions.unshift(transaction);
    Storage.save();

    // Reset form
    DOM.form.reset();

    renderAll();
}

function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        AppState.transactions = AppState.transactions.filter(t => t.id !== id);
        Storage.save();
        renderAll();
    }
}

// ============================================
// CUSTOM CATEGORIES
// ============================================
function handleAddCustomCategory() {
    const name = DOM.newCategoryName.value.trim();
    const color = DOM.newCategoryColor.value;

    if (!name) {
        alert('Please enter a category name.');
        return;
    }

    if (AppState.categories[name]) {
        alert('This category already exists.');
        return;
    }

    AppState.categories[name] = color;
    Storage.save();

    updateCategoryOptions();
    DOM.newCategoryName.value = '';
    DOM.customCatForm.classList.add('hidden');

    // Select the new category
    DOM.itemCategory.value = name;

    renderChart();
}

function updateCategoryOptions() {
    const currentValue = DOM.itemCategory.value;
    DOM.itemCategory.innerHTML = '<option value="" disabled selected>Select category</option>';

    Object.keys(AppState.categories).forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        DOM.itemCategory.appendChild(option);
    });

    if (currentValue && AppState.categories[currentValue]) {
        DOM.itemCategory.value = currentValue;
    }
}

// ============================================
// RENDERING
// ============================================
function renderAll() {
    renderTransactions();
    renderBalance();
    renderMonthlySummary();
    renderLimit();
    renderChart();
}

function renderTransactions() {
    const sorted = getSortedTransactions();

    if (sorted.length === 0) {
        DOM.transactionsList.innerHTML = '';
        DOM.emptyState.classList.remove('hidden');
        return;
    }

    DOM.emptyState.classList.add('hidden');

    DOM.transactionsList.innerHTML = sorted.map(t => {
        const categoryColor = AppState.categories[t.category] || '#95a5a6';
        const isOverLimit = AppState.spendingLimit > 0 && t.amount > AppState.spendingLimit * 0.2;

        return `
            <div class="transaction-item ${isOverLimit ? 'highlight-limit' : ''}">
                <div class="transaction-info">
                    <div class="transaction-name">${escapeHtml(t.name)}</div>
                    <div class="transaction-meta">
                        <span class="category-badge" style="background-color: ${categoryColor}">${escapeHtml(t.category)}</span>
                        <span>${formatDate(t.date)}</span>
                    </div>
                </div>
                <div class="transaction-amount">$${formatAmount(t.amount)}</div>
                <button class="btn-delete" onclick="deleteTransaction('${t.id}')">Delete</button>
            </div>
        `;
    }).join('');
}

function getSortedTransactions() {
    let sorted = [...AppState.transactions];

    switch (AppState.sortBy) {
        case 'newest':
            sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'oldest':
            sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'amount-high':
            sorted.sort((a, b) => b.amount - a.amount);
            break;
        case 'amount-low':
            sorted.sort((a, b) => a.amount - b.amount);
            break;
        case 'category':
            sorted.sort((a, b) => a.category.localeCompare(b.category));
            break;
        case 'name':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }

    return sorted;
}

function renderBalance() {
    const total = AppState.transactions.reduce((sum, t) => sum + t.amount, 0);
    DOM.totalBalance.textContent = `$${formatAmount(total)}`;
}

function renderMonthlySummary() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = AppState.transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const monthlyTotal = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
    const monthlyCount = monthlyTransactions.length;
    const monthlyAvg = monthlyCount > 0 ? monthlyTotal / monthlyCount : 0;

    // Top category
    const categoryTotals = {};
    monthlyTransactions.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    let topCat = '-';
    let topAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, amount]) => {
        if (amount > topAmount) {
            topAmount = amount;
            topCat = cat;
        }
    });

    DOM.monthlyTotal.textContent = `$${formatAmount(monthlyTotal)}`;
    DOM.monthlyCount.textContent = monthlyCount;
    DOM.monthlyAvg.textContent = `$${formatAmount(monthlyAvg)}`;
    DOM.topCategory.textContent = topCat;
}

function renderLimit() {
    const total = AppState.transactions.reduce((sum, t) => sum + t.amount, 0);
    const limit = AppState.spendingLimit;
    const percentage = limit > 0 ? Math.min((total / limit) * 100, 100) : 0;

    DOM.limitProgress.style.width = `${percentage}%`;
    DOM.limitSpent.textContent = `$${formatAmount(total)}`;
    DOM.limitTotal.textContent = `/ $${formatAmount(limit)}`;

    // Color based on percentage
    if (percentage < 50) {
        DOM.limitProgress.style.background = 'var(--success)';
    } else if (percentage < 80) {
        DOM.limitProgress.style.background = 'var(--warning)';
    } else {
        DOM.limitProgress.style.background = 'var(--danger)';
    }

    // Alert
    if (total > limit && limit > 0) {
        DOM.limitAlert.classList.remove('hidden');
    } else {
        DOM.limitAlert.classList.add('hidden');
    }
}

function handleSaveLimit() {
    const value = parseFloat(DOM.limitInput.value);
    if (isNaN(value) || value <= 0) {
        alert('Please enter a valid limit amount.');
        return;
    }

    AppState.spendingLimit = value;
    Storage.save();
    DOM.limitModal.classList.add('hidden');
    renderLimit();
}

// ============================================
// CHART
// ============================================
function renderChart() {
    const ctx = DOM.chartCanvas.getContext('2d');

    // Calculate category totals
    const categoryTotals = {};
    AppState.transactions.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = labels.map(cat => AppState.categories[cat] || '#95a5a6');

    // Destroy existing chart
    if (AppState.chartInstance) {
        AppState.chartInstance.destroy();
    }

    const isDark = AppState.theme === 'dark';

    AppState.chartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: isDark ? '#16213e' : '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: isDark ? '#e0e0e0' : '#2c3e50',
                        padding: 16,
                        font: {
                            size: 12,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: $${formatAmount(context.parsed)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ============================================
// UTILITIES
// ============================================
function formatAmount(amount) {
    return amount.toFixed(2);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// START APP
// ============================================
document.addEventListener('DOMContentLoaded', init);