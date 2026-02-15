// ==========================================
// 1. CONFIGURATION
// ==========================================
const API_URL = 'https://expense-intelligence.onrender.com'; // Base URL
let transactions = [];
let myChart = null;
let transactionToDelete = null;
let debounceTimer; // Timer for AI prediction

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

// Modal & Theme
const modal = document.getElementById('modal-overlay');
const confirmBtn = document.getElementById('confirm-delete-btn');
const desktopThemeBtn = document.getElementById('desktop-theme-toggle');
const mobileThemeBtn = document.getElementById('mobile-theme-toggle');
const html = document.documentElement;

// ==========================================
// 3. AI PREDICTION LOGIC (The "Brain")
// ==========================================

textInput.addEventListener('input', () => {
    const text = textInput.value;
    
    // Clear previous timer (Debounce)
    clearTimeout(debounceTimer);

    // If text is short, don't bother
    if (text.length < 3) return;

    // Wait 500ms after user stops typing
    debounceTimer = setTimeout(async () => {
        try {
            const res = await fetch(`${API_URL}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            });
            
            if (res.ok) {
                const data = await res.json();
                const predictedCategory = data.category;
                
                // Only auto-select if user hasn't manually picked one yet (optional)
                // Or just always update it for the "Magic" feel
                selectCategory(predictedCategory);
            }
        } catch (err) {
            console.error("AI Prediction Failed:", err);
        }
    }, 500); 
});

// Helper to update the Custom Dropdown programmatically
function selectCategory(catName) {
    // Find the option element with this value
    const option = document.querySelector(`.option[data-value="${catName}"]`);
    if (option) {
        // Update Hidden Input
        categoryInput.value = catName;
        // Update Visual Text & Icon
        dropdownText.innerHTML = option.innerHTML;
        dropdownText.style.color = "var(--text-primary)";
        
        // Visual Feedback (Flash the dropdown)
        dropdownTrigger.style.borderColor = "#6366F1";
        setTimeout(() => {
            dropdownTrigger.style.borderColor = "transparent";
        }, 300);
    }
}

// ==========================================
// 4. THEME LOGIC
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
    if(document.getElementById('theme-text')) {
        document.getElementById('theme-text').innerText = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
        document.querySelector('#desktop-theme-toggle i').className = iconClass;
    }
    if(mobileThemeBtn) mobileThemeBtn.querySelector('i').className = iconClass;
}

const savedTheme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', savedTheme);
updateThemeUI(savedTheme);

if (desktopThemeBtn) desktopThemeBtn.addEventListener('click', toggleTheme);
if (mobileThemeBtn) mobileThemeBtn.addEventListener('click', toggleTheme);

// Date
document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// ==========================================
// 5. DROPDOWN INTERACTION
// ==========================================
dropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
});

dropdownOptions.forEach(option => {
    option.addEventListener('click', () => {
        const value = option.getAttribute('data-value');
        dropdownText.innerHTML = option.innerHTML;
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
// 6. API & UI LOGIC
// ==========================================
async function getData() {
    try {
        const res = await fetch(`${API_URL}/transactions`);
        const data = await res.json();
        transactions = data;
        updateUI();
    } catch (err) { console.error(err); }
}

async function addTransaction(e) {
    e.preventDefault();
    const text = textInput.value;
    const amountVal = amountInput.value;
    const categoryVal = categoryInput.value;

    if (!text || !amountVal || !categoryVal) { alert("Please fill in all fields"); return; }

    let finalAmount = Math.abs(Number(amountVal));
    if (categoryVal !== 'Income') finalAmount *= -1;

    try {
        const res = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, amount: finalAmount, category: categoryVal, date: new Date().toLocaleDateString() })
        });
        if (res.ok) {
            const saved = await res.json();
            transactions.push(saved);
            updateUI();
            textInput.value = ''; amountInput.value = ''; 
            categoryInput.value = ''; dropdownText.innerText = 'Select Category';
            dropdownText.style.color = "var(--text-secondary)";
        }
    } catch (err) { console.error(err); }
}

async function deleteTransaction(id) {
    try {
        await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
        transactions = transactions.filter(t => t.id !== id);
        updateUI();
    } catch (err) { console.error(err); }
}

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
                <div class="t-info"><h4>${t.text}</h4><p>${t.category} • ${t.date}</p></div>
            </div>
            <div class="t-right" style="display:flex; align-items:center; gap:12px;">
                <span class="t-amount ${t.amount > 0 ? 'positive' : ''}">${formatMoney(t.amount, true)}</span>
                <button class="delete-btn" onclick="showModal(${t.id})"><i class="ph-fill ph-trash"></i></button>
            </div>`;
        list.appendChild(el);
    });
    renderChart();
}

// Helpers
const formatMoney = (num, sign = false) => (sign && num > 0 ? '+' : '') + '$' + Number(num).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
const getIcon = (cat) => ({'Food':'ph-hamburger','Transport':'ph-car','Shopping':'ph-bag','Entertainment':'ph-game-controller','Health':'ph-heartbeat','Utilities':'ph-lightning','Income':'ph-money'}[cat] || 'ph-tag');

function renderChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const expenses = transactions.filter(t => t.amount < 0);
    const categories = {};
    expenses.forEach(t => { categories[t.category] = (categories[t.category] || 0) + Math.abs(t.amount); });
    
    if (myChart) myChart.destroy();
    const isDark = html.getAttribute('data-theme') === 'dark';
    
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{ data: Object.values(categories), backgroundColor: ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'], borderWidth: 0, hoverOffset: 6 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: isDark ? '#A1A1AA' : '#64748B', font: { family: 'Outfit', size: 11 }, boxWidth: 10, padding: 15 } } },
            cutout: '75%', animation: { animateScale: true, animateRotate: true }
        }
    });
}

// Modal
function showModal(id) { transactionToDelete = id; modal.classList.remove('hidden'); }
function closeModal() { transactionToDelete = null; modal.classList.add('hidden'); }
confirmBtn.addEventListener('click', async () => { if(transactionToDelete) { await deleteTransaction(transactionToDelete); closeModal(); }});
modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });

form.addEventListener('submit', addTransaction);
getData();