from typing import Optional, List
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, create_engine, Session, select

# ==========================================
# 1. DATABASE CONFIGURATION
# ==========================================

# Define the Data Model (Schema)
class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    amount: float
    date: str
    category: str  # New Column for Analytics

# Create the SQLite Database
sqlite_file_name = "expenses.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url)

# Function to create tables
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# Dependency to get a DB session
def get_session():
    with Session(engine) as session:
        yield session

# ==========================================
# 2. APP CONFIGURATION
# ==========================================
app = FastAPI()

# Allow Frontend to communicate with Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Run on startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# ==========================================
# 3. API ENDPOINTS (CRUD)
# ==========================================

# GET: Fetch all transactions
@app.get("/transactions", response_model=List[Transaction])
def get_transactions(session: Session = Depends(get_session)):
    transactions = session.exec(select(Transaction)).all()
    return transactions

# POST: Add a new transaction
@app.post("/transactions", response_model=Transaction)
def add_transaction(transaction: Transaction, session: Session = Depends(get_session)):
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    return transaction

# DELETE: Remove a transaction
@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, session: Session = Depends(get_session)):
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    session.delete(transaction)
    session.commit()
    return {"ok": True}