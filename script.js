// ==========================================
// 1. CONFIGURATION
// ==========================================
const API_URL = 'http://127.0.0.1:8000/transactions';
let transactions = [];

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const balanceEl = document.getElementById('net-balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expense');
const listEl = document.getElementById('transaction-list');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const category = document.getElementById('category');

// ==========================================
// 3. CORE FUNCTIONS (Async)
// ==========================================

// --- Fetch Data from Backend ---
async function getTransactions() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        transactions = data;
        init();
    } catch (err) {
        console.error("Error fetching data:", err);
        alert("Could not connect to Backend. Is the Python server running?");
    }
}

// --- Add New Transaction ---
async function addTransaction(e) {
    e.preventDefault();

    if (text.value.trim() === '' || amount.value.trim() === '') {
        alert('Please add a text and amount');
        return;
    }

    // SMART LOGIC: 
    // If Category is 'Income', amount is Positive (+).
    // If Category is ANYTHING else (Food, etc.), amount is Negative (-).
    let rawAmount = Math.abs(Number(amount.value));
    if (category.value !== 'Income') {
        rawAmount = rawAmount * -1;
    }

    const newTransaction = {
        text: text.value,
        amount: rawAmount,
        date: new Date().toLocaleDateString(),
        category: category.value
    };

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTransaction)
        });

        if (res.ok) {
            const savedTransaction = await res.json();
            transactions.push(savedTransaction);
            addTransactionDOM(savedTransaction);
            updateValues();
            
            text.value = '';
            amount.value = '';
        }
    } catch (err) {
        console.error("Error adding transaction:", err);
    }
}

// --- Remove Transaction ---
async function removeTransaction(id) {
    try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        transactions = transactions.filter(t => t.id !== id);
        init();
    } catch (err) {
        console.error("Error deleting transaction:", err);
    }
}

// ==========================================
// 4. UI FUNCTIONS
// ==========================================

function addTransactionDOM(transaction) {
    const sign = transaction.amount < 0 ? '-' : '+';
    const item = document.createElement('div');
    item.classList.add('transaction-item');

    item.innerHTML = `
        <div class="t-info">
            <span class="t-title">${transaction.text}</span>
            <small style="color: #64748b; font-size: 0.8rem;">${transaction.category}</small>
            <span class="t-date">${transaction.date}</span>
        </div>
        <div class="right-side">
            <span class="t-amount ${transaction.amount < 0 ? 'negative' : 'positive'}">
                ${sign}$${Math.abs(transaction.amount).toFixed(2)}
            </span>
            <button class="delete-btn" onclick="removeTransaction(${transaction.id})">×</button>
        </div>
    `;

    listEl.appendChild(item);
}

function updateValues() {
    const amounts = transactions.map(t => t.amount);

    const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0).toFixed(2);
    const expense = (amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1).toFixed(2);

    balanceEl.innerText = `$${total}`;
    incomeEl.innerText = `$${income}`;
    expenseEl.innerText = `$${expense}`;
}

function init() {
    listEl.innerHTML = '';
    transactions.forEach(addTransactionDOM);
    updateValues();
    
    renderChart(); // <--- NEW: Update the chart!
}

// ==========================================
// 5. START APP
// ==========================================
form.addEventListener('submit', addTransaction);
getTransactions();
// 6. ANALYTICS (CHART.JS)
// ==========================================

let myChart = null; // Variable to hold the chart instance

function renderChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');

    // 1. Filter only Expenses (Negative numbers)
    const expenses = transactions.filter(t => t.amount < 0);

    // 2. Group by Category (The Hard Part)
    // We want to turn: [{cat: 'Food', amt: -10}, {cat: 'Food', amt: -20}]
    // Into: {'Food': 30}
    const categories = {};
    expenses.forEach(transaction => {
        const cat = transaction.category;
        const amt = Math.abs(transaction.amount); // Turn -20 to 20
        
        if (categories[cat]) {
            categories[cat] += amt; // Add to existing total
        } else {
            categories[cat] = amt; // Start new total
        }
    });

    // 3. Prepare Data for Chart.js
    const labels = Object.keys(categories); // ['Food', 'Transport']
    const data = Object.values(categories); // [30, 50]

    // 4. Destroy old chart if it exists (so we don't draw 2 charts on top of each other)
    if (myChart) {
        myChart.destroy();
    }

    // 5. Draw the New Chart
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Expenses',
                data: data,
                backgroundColor: [
                    '#ef4444', // Red
                    '#f59e0b', // Orange
                    '#10b981', // Green
                    '#3b82f6', // Blue
                    '#8b5cf6', // Purple
                    '#ec4899', // Pink
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right' // Put labels on the side
                }
            }
        }
    });
}