from contextlib import asynccontextmanager
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, create_engine, Session, select

# ==========================================
# 1. DATABASE MODELS & CONFIG
# ==========================================

class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    amount: float
    date: str
    category: str

# Database Connection (SQLite for now, ready for PostgreSQL)
sqlite_file_name = "expenses.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# check_same_thread=False is needed only for SQLite
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# ==========================================
# 2. LIFESPAN MANAGER (The Modern Way)
# ==========================================
# This replaces the old @app.on_event("startup")
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the DB when app starts
    create_db_and_tables()
    yield
    # Clean up when app stops (if needed later)

# ==========================================
# 3. APP SETUP
# ==========================================
app = FastAPI(
    title="ONYX API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS: Allow Vercel & Localhost to talk to us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace "*" with your Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 4. DEPENDENCIES
# ==========================================
# This ensures every request gets a fresh DB session and closes it after
def get_session():
    with Session(engine) as session:
        yield session

# ==========================================
# 5. API ENDPOINTS
# ==========================================

@app.get("/")
def read_root():
    return {"status": "active", "service": "ONYX Financial Intelligence"}

@app.get("/transactions", response_model=List[Transaction], status_code=status.HTTP_200_OK)
def get_transactions(session: Session = Depends(get_session)):
    """
    Fetch all transactions, sorted by ID (Newest First).
    Sorting in SQL is faster than sorting in JavaScript.
    """
    # SQL: SELECT * FROM transaction ORDER BY id DESC;
    statement = select(Transaction).order_by(Transaction.id.desc())
    transactions = session.exec(statement).all()
    return transactions

@app.post("/transactions", response_model=Transaction, status_code=status.HTTP_201_CREATED)
def add_transaction(transaction: Transaction, session: Session = Depends(get_session)):
    """
    Add a new transaction to the ledger.
    """
    try:
        session.add(transaction)
        session.commit()
        session.refresh(transaction)
        return transaction
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail="Database Error")

@app.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int, session: Session = Depends(get_session)):
    """
    Remove a transaction. Returns 204 No Content on success.
    """
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    session.delete(transaction)
    session.commit()
    return None # 204 means "Done, nothing to show"