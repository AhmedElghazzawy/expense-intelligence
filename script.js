// ==========================================
// 1. CONFIGURATION & STATE
// ==========================================
const API_URL = 'https://expense-intelligence.onrender.com/transactions';
let transactions = [];
let myChart = null;
let transactionToDelete = null; // Stores ID while modal is open

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const form = document.getElementById('form');
const textInput = document.getElementById('text');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category'); // Hidden input

// Theme Elements
const themeBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const themeText = document.getElementById('theme-text');
const html = document.documentElement;

// Custom Dropdown Elements
const dropdownTrigger = document.getElementById('category-trigger');
const dropdownText = document.getElementById('selected-category-text');
const dropdownMenu = document.getElementById('custom-options');
const dropdownOptions = document.querySelectorAll('.option');

// Modal Elements
const modal = document.getElementById('modal-overlay');
const confirmBtn = document.getElementById('confirm-delete-btn');

// ==========================================
// 3. THEME LOGIC (Luxury Mode)
// ==========================================

// Function to update the button UI (Icon & Text)
function updateThemeUI(theme) {
    if (theme === 'dark') {
        themeIcon.className = 'ph-fill ph-moon';
        themeText.innerText = 'Dark Mode';
    } else {
        themeIcon.className = 'ph-fill ph-sun';
        themeText.innerText = 'Light Mode';
    }
}

// Load Saved Theme (Default to Dark)
const savedTheme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', savedTheme);
if (themeBtn) updateThemeUI(savedTheme);

// Toggle Theme on Click
if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        
        html.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeUI(next);
    });
}

// Set Current Date
const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', dateOptions);

// ==========================================
// 4. CUSTOM DROPDOWN INTERACTION
// ==========================================

// Toggle Menu
dropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
});

// Handle Option Selection
dropdownOptions.forEach(option => {
    option.addEventListener('click', () => {
        const value = option.getAttribute('data-value');
        const htmlContent = option.innerHTML; // Get text + icon

        // Update UI
        dropdownText.innerHTML = htmlContent;
        dropdownText.style.color = "var(--text-primary)"; // Make text bright
        
        // Update Hidden Input (For Logic)
        categoryInput.value = value;
        
        // Close Menu
        dropdownMenu.classList.add('hidden');
    });
});

// Close when clicking outside
document.addEventListener('click', (e) => {
    if (!dropdownTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.add('hidden');
    }
});

// ==========================================
// 5. CUSTOM MODAL LOGIC
// ==========================================

function showModal(id) {
    transactionToDelete = id;
    modal.classList.remove('hidden');
}

function closeModal() {
    transactionToDelete = null;
    modal.classList.add('hidden');
}

// Confirm Delete
confirmBtn.addEventListener('click', async () => {
    if (transactionToDelete) {
        await deleteTransaction(transactionToDelete);
        closeModal();
    }
});

// Close on Overlay Click
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// ==========================================
// 6. API OPERATIONS
// ==========================================

// GET Data
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

// POST Data
async function addTransaction(e) {
    e.preventDefault();

    const text = textInput.value;
    const amountVal = amountInput.value;
    const categoryVal = categoryInput.value;

    if (text.trim() === '' || amountVal.trim() === '' || categoryVal === '') {
        // Simple shake animation or alert could go here
        alert("Please fill in all fields"); 
        return;
    }

    // Smart Sign Logic
    let finalAmount = Math.abs(Number(amountVal));
    if (categoryVal !== 'Income') {
        finalAmount = finalAmount * -1;
    }

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
            const savedTransaction = await res.json();
            transactions.push(savedTransaction);
            updateUI();
            
            // Reset Form
            textInput.value = '';
            amountInput.value = '';
            categoryInput.value = '';
            dropdownText.innerText = 'Select Category';
            dropdownText.style.color = "var(--text-secondary)";
        }
    } catch (err) {
        console.error("Error adding transaction:", err);
    }
}

// DELETE Data
async function deleteTransaction(id) {
    try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        transactions = transactions.filter(t => t.id !== id);
        updateUI();
    } catch (err) {
        console.error("Error deleting transaction:", err);
    }
}

// ==========================================
// 7. UI RENDERING
// ==========================================

function updateUI() {
    // 1. Update Totals
    const amounts = transactions.map(t => t.amount);
    const total = amounts.reduce((acc, item) => (acc += item), 0);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
    const expense = amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0);

    document.getElementById('net-balance').innerText = formatMoney(total);
    document.getElementById('total-income').innerText = formatMoney(income, true);
    document.getElementById('total-expense').innerText = formatMoney(Math.abs(expense), true);

    // 2. Render List
    const list = document.getElementById('transaction-list');
    list.innerHTML = '';

    // Show last 6 items
    transactions.slice().reverse().slice(0, 6).forEach(t => {
        const el = document.createElement('div');
        el.className = 't-item';
        el.innerHTML = `
            <div class="t-left">
                <div class="t-icon">
                    <i class="ph-light ${getIcon(t.category)}"></i>
                </div>
                <div class="t-info">
                    <h4>${t.text}</h4>
                    <p>${t.category} • ${t.date}</p>
                </div>
            </div>
            <div class="t-right" style="display:flex; align-items:center; gap:12px;">
                <span class="t-amount ${t.amount > 0 ? 'positive' : ''}">
                    ${t.amount > 0 ? '+' : ''}${formatMoney(Math.abs(t.amount))}
                </span>
                <button class="delete-btn" onclick="showModal(${t.id})">
                    <i class="ph-fill ph-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(el);
    });

    renderChart();
}

// Helper: Format Money
function formatMoney(num, sign = false) {
    return (sign ? (num < 0 ? '-' : '+') : '') + '$' + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Helper: Get Icon
function getIcon(cat) {
    const map = {
        'Food': 'ph-hamburger',
        'Transport': 'ph-car',
        'Shopping': 'ph-bag',
        'Entertainment': 'ph-game-controller',
        'Health': 'ph-heartbeat',
        'Utilities': 'ph-lightning',
        'Income': 'ph-money',
        'General': 'ph-tag'
    };
    return map[cat] || 'ph-tag';
}

// ==========================================
// 8. CHART.JS
// ==========================================

function renderChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const expenses = transactions.filter(t => t.amount < 0);
    
    // Group by Category
    const categories = {};
    expenses.forEach(t => {
        const cat = t.category;
        categories[cat] = (categories[cat] || 0) + Math.abs(t.amount);
    });

    if (myChart) myChart.destroy();

    // Check Theme for Chart Colors
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
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'right', 
                    labels: { 
                        color: textColor, 
                        font: { family: 'Outfit', size: 11 }, 
                        boxWidth: 10,
                        padding: 15
                    } 
                }
            },
            cutout: '75%', 
            animation: { animateScale: true, animateRotate: true }
        }
    });
}

// ==========================================
// 9. INIT
// ==========================================
form.addEventListener('submit', addTransaction);
getData();