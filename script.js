// ==========================================
// 1. STATE MANAGEMENT (The "Database")
// ==========================================

// Check LocalStorage for existing data. If none, start with an empty array.
// We use 'localStorage' so data survives a page refresh.
const localStorageTransactions = JSON.parse(localStorage.getItem('transactions'));
let transactions = localStorage.getItem('transactions') !== null ? localStorageTransactions : [];

// ==========================================
// 2. DOM ELEMENTS (The Connectors)
// ==========================================
const balanceEl = document.getElementById('net-balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expense');
const listEl = document.getElementById('transaction-list');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');

// ==========================================
// 3. CORE FUNCTIONS (The Logic)
// ==========================================

// --- Function A: Generate HTML for a Transaction ---
function addTransactionDOM(transaction) {
    // 1. Determine sign (+ or -)
    const sign = transaction.amount < 0 ? '-' : '+';

    // 2. Create the list item
    const item = document.createElement('div');
    item.classList.add('transaction-item');

    // 3. Fill the HTML
    item.innerHTML = `
        <div class="t-info">
            <span class="t-title">${transaction.text}</span>
            <span class="t-date">${transaction.date}</span>
        </div>
        <div class="right-side">
            <span class="t-amount ${transaction.amount < 0 ? 'negative' : 'positive'}">
                ${sign}$${Math.abs(transaction.amount).toFixed(2)}
            </span>
            <button class="delete-btn" onclick="removeTransaction(${transaction.id})" 
                style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:1.2rem; font-weight:bold;">
                ×
            </button>
        </div>
    `;

    // 4. Add to the list
    listEl.appendChild(item);
}

// --- Function B: Calculate Totals & Update UI ---
function updateValues() {
    // 1. Get array of amounts
    const amounts = transactions.map(transaction => transaction.amount);

    // 2. Calculate Total Balance
    const total = amounts
        .reduce((acc, item) => (acc += item), 0)
        .toFixed(2);

    // 3. Calculate Income (Positive only)
    const income = amounts
        .filter(item => item > 0)
        .reduce((acc, item) => (acc += item), 0)
        .toFixed(2);

    // 4. Calculate Expense (Negative only)
    const expense = (
        amounts
        .filter(item => item < 0)
        .reduce((acc, item) => (acc += item), 0) * -1
    ).toFixed(2);

    // 5. Update HTML
    balanceEl.innerText = `$${total}`;
    incomeEl.innerText = `$${income}`;
    expenseEl.innerText = `$${expense}`;
}

// --- Function C: Add New Transaction ---
function addTransaction(e) {
    e.preventDefault(); // Stop refresh

    // Validation
    if (text.value.trim() === '' || amount.value.trim() === '') {
        alert('Please add a text and amount');
        return;
    }

    const newTransaction = {
        id: Math.floor(Math.random() * 100000000), // Random ID
        text: text.value,
        amount: +amount.value, // Convert string to number
        date: new Date().toLocaleDateString()
    };

    transactions.push(newTransaction); // Add to State

    addTransactionDOM(newTransaction); // Add to UI
    updateValues(); // Update Math
    updateLocalStorage(); // Save to Browser

    // Clear inputs
    text.value = '';
    amount.value = '';
}

// --- Function D: Delete Transaction ---
function removeTransaction(id) {
    // Filter out the item with the matching ID
    transactions = transactions.filter(transaction => transaction.id !== id);

    // Re-save and Re-render
    updateLocalStorage();
    init();
}

// --- Function E: Save to Local Storage ---
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// ==========================================
// 4. INITIALIZATION
// ==========================================
function init() {
    listEl.innerHTML = ''; // Clear list
    transactions.forEach(addTransactionDOM); // Load history
    updateValues(); // Calculate totals
}

// Event Listener
form.addEventListener('submit', addTransaction);

// Start App
init();