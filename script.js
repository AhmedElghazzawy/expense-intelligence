// ==========================================
// 1. CONFIGURATION
// ==========================================
// YOUR LIVE RENDER URL
const API_URL = 'https://expense-intelligence.onrender.com/transactions';

// State Variables
let transactions = [];
let myChart = null;
let transactionToDelete = null;

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const form = document.getElementById('form');
const textInput = document.getElementById('text');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');

// Custom Dropdown
const dropdownTrigger = document.getElementById('category-trigger');
const dropdownText = document.getElementById('selected-category-text');
const dropdownMenu = document.getElementById('custom-options');
const dropdownOptions = document.querySelectorAll('.option');

// Modal
const modal = document.getElementById('modal-overlay');
const confirmBtn = document.getElementById('confirm-delete-btn');

// Theme Toggles
const desktopThemeBtn = document.getElementById('desktop-theme-toggle');
const mobileThemeBtn = document.getElementById('mobile-theme-toggle');
const html = document.documentElement;

// ==========================================
// 3. THEME LOGIC (Desktop & Mobile)
// ==========================================

function toggleTheme() {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeUI(next);
}

function updateThemeUI(theme) {
    const iconClass = theme === 'dark' ? 'ph-fill ph-moon' : 'ph-fill ph-sun';
    
    // Update Desktop Sidebar
    if(document.getElementById('theme-text')) {
        document.getElementById('theme-text').innerText = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
        document.querySelector('#desktop-theme-toggle i').className = iconClass;
    }

    // Update Mobile Header
    if(mobileThemeBtn) {
        mobileThemeBtn.querySelector('i').className = iconClass;
    }
}

// Initialize Theme
const savedTheme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', savedTheme);
updateThemeUI(savedTheme);

// Event Listeners
if (desktopThemeBtn) desktopThemeBtn.addEventListener('click', toggleTheme);
if (mobileThemeBtn) mobileThemeBtn.addEventListener('click', toggleTheme);

// Set Date
const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', dateOptions);

// ==========================================
// 4. CUSTOM DROPDOWN LOGIC
// ==========================================

dropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
});

dropdownOptions.forEach(option => {
    option.addEventListener('click', () => {
        const value = option.getAttribute('data-value');
        const htmlContent = option.innerHTML;

        dropdownText.innerHTML = htmlContent;
        dropdownText.style.color = "var(--text-primary)";
        categoryInput.value = value;
        dropdownMenu.classList.add('hidden');
    });
});

document.addEventListener('click', (e) => {
    if (!dropdownTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.add('hidden');
    }
});

// ==========================================
// 5. MODAL LOGIC
// ==========================================

function showModal(id) {
    transactionToDelete = id;
    modal.classList.remove('hidden');
}

function closeModal() {
    transactionToDelete = null;
    modal.classList.add('hidden');
}

confirmBtn.addEventListener('click', async () => {
    if (transactionToDelete) {
        await deleteTransaction(transactionToDelete);
        closeModal();
    }
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// ==========================================
// 6. API OPERATIONS
// ==========================================

async function getData() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        transactions = data;
        updateUI();
    } catch (err) {
        console.error("Error fetching data:", err);
    }
}

async function addTransaction(e) {
    e.preventDefault();
    const text = textInput.value;
    const amountVal = amountInput.value;
    const categoryVal = categoryInput.value;

    if (text.trim() === '' || amountVal.trim() === '' || categoryVal === '') {
        alert("Please fill in all fields"); 
        return;
    }

    let finalAmount = Math.abs(Number(amountVal));
    if (categoryVal !== 'Income') finalAmount = finalAmount * -1;

    const newTx = {
        text: text,
        amount: finalAmount,
        category: categoryVal,
        date: new Date().toLocaleDateString()
    };

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTx)
        });

        if (res.ok) {
            const saved = await res.json();
            transactions.push(saved);
            updateUI();
            textInput.value = '';
            amountInput.value = '';
            categoryInput.value = '';
            dropdownText.innerText = 'Select Category';
            dropdownText.style.color = "var(--text-secondary)";
        }
    } catch (err) { console.error(err); }
}

async function deleteTransaction(id) {
    try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        transactions = transactions.filter(t => t.id !== id);
        updateUI();
    } catch (err) { console.error(err); }
}

// ==========================================
// 7. UI RENDERING
// ==========================================

function updateUI() {
    const amounts = transactions.map(t => t.amount);
    const total = amounts.reduce((acc, item) => (acc += item), 0);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
    const expense = amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0);

    document.getElementById('net-balance').innerText = formatMoney(total);
    document.getElementById('total-income').innerText = formatMoney(income, true);
    document.getElementById('total-expense').innerText = formatMoney(Math.abs(expense), true);

    const list = document.getElementById('transaction-list');
    list.innerHTML = '';

    transactions.slice().reverse().slice(0, 10).forEach(t => {
        const el = document.createElement('div');
        el.className = 't-item';
        el.innerHTML = `
            <div class="t-left">
                <div class="t-icon"><i class="ph-light ${getIcon(t.category)}"></i></div>
                <div class="t-info">
                    <h4>${t.text}</h4>
                    <p>${t.category} • ${t.date}</p>
                </div>
            </div>
            <div class="t-right" style="display:flex; align-items:center; gap:12px;">
                <span class="t-amount ${t.amount > 0 ? 'positive' : ''}">
                    ${t.amount > 0 ? '+' : ''}${formatMoney(Math.abs(t.amount))}
                </span>
                <button class="delete-btn" onclick="showModal(${t.id})"><i class="ph-fill ph-trash"></i></button>
            </div>
        `;
        list.appendChild(el);
    });
    renderChart();
}

function formatMoney(num, sign = false) {
    return (sign ? (num < 0 ? '-' : '+') : '') + '$' + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function getIcon(cat) {
    const map = {
        'Food': 'ph-hamburger', 'Transport': 'ph-car', 'Shopping': 'ph-bag',
        'Entertainment': 'ph-game-controller', 'Health': 'ph-heartbeat',
        'Utilities': 'ph-lightning', 'Income': 'ph-money', 'General': 'ph-tag'
    };
    return map[cat] || 'ph-tag';
}

function renderChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const expenses = transactions.filter(t => t.amount < 0);
    const categories = {};
    expenses.forEach(t => {
        const cat = t.category;
        categories[cat] = (categories[cat] || 0) + Math.abs(t.amount);
    });

    if (myChart) myChart.destroy();

    const isDark = html.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#A1A1AA' : '#64748B';

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: textColor, font: { family: 'Outfit', size: 11 }, boxWidth: 10, padding: 15 } }
            },
            cutout: '75%', animation: { animateScale: true, animateRotate: true }
        }
    });
}

// Start
form.addEventListener('submit', addTransaction);
getData();