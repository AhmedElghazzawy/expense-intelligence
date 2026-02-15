import os
from contextlib import asynccontextmanager
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, create_engine, Session, select

# ==========================================
# 1. PROFESSIONAL DATABASE CONFIG
# ==========================================

class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    amount: float
    date: str
    category: str

# SMART CONNECTION:
# If we are on Render (Cloud), use the 'DATABASE_URL' environment variable.
# If we are on Laptop (Local), use 'expenses.db'.
database_url = os.environ.get("DATABASE_URL", "sqlite:///expenses.db")

# Fix for Postgres URL format on Render (it starts with postgres:// but SQLAlchemy needs postgresql://)
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in database_url else {}
engine = create_engine(database_url, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# ==========================================
# 2. LIFESPAN (Startup Logic)
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

# ==========================================
# 3. APP SETUP
# ==========================================
app = FastAPI(
    title="ONYX API",
    version="2.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_session():
    with Session(engine) as session:
        yield session

# ==========================================
# 4. ENDPOINTS
# ==========================================

# FIX FOR "NOT FOUND": Now we have a homepage!
@app.get("/", status_code=status.HTTP_200_OK)
def root():
    return {
        "system": "ONYX Financial Intelligence",
        "status": "operational",
        "database": "connected"
    }

@app.get("/transactions", response_model=List[Transaction])
def get_transactions(session: Session = Depends(get_session)):
    # Sort by ID descending (Newest on top)
    statement = select(Transaction).order_by(Transaction.id.desc())
    transactions = session.exec(statement).all()
    return transactions

@app.post("/transactions", response_model=Transaction, status_code=status.HTTP_201_CREATED)
def add_transaction(transaction: Transaction, session: Session = Depends(get_session)):
    try:
        session.add(transaction)
        session.commit()
        session.refresh(transaction)
        return transaction
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int, session: Session = Depends(get_session)):
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    session.delete(transaction)
    session.commit()
    return None