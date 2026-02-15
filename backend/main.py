import os
from contextlib import asynccontextmanager
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, create_engine, Session, select
from pydantic import BaseModel

# ==========================================
# 1. DATABASE CONFIG
# ==========================================

class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    amount: float
    date: str
    category: str

# Model for the Prediction Request
class PredictionRequest(BaseModel):
    text: str

database_url = os.environ.get("DATABASE_URL", "sqlite:///expenses.db")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in database_url else {}
engine = create_engine(database_url, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

# ==========================================
# 2. THE AI BRAIN (Keyword Engine)
# ==========================================
def predict_category(text: str) -> str:
    text = text.lower()
    
    keywords = {
        "Food": ["mcdonalds", "kfc", "burger", "starbucks", "coffee", "pizza", "restaurant", "lunch", "dinner", "groceries", "market", "bread", "cafe", "bistro", "sushi", "taco", "steak", "grill", "bar", "pub", "wine", "beer", "drink"],
        "Transport": ["uber", "lyft", "taxi", "bus", "train", "metro", "gas", "fuel", "petrol", "parking", "shell", "bp", "tesla", "flight", "airline", "ticket", "subway", "scooter", "bike"],
        "Shopping": ["amazon", "ebay", "walmart", "target", "apple", "nike", "zara", "clothes", "shoes", "mall", "store", "shop", "gift", "book", "electronics"],
        "Entertainment": ["netflix", "spotify", "hbo", "cinema", "movie", "game", "steam", "playstation", "xbox", "concert", "show", "ticket", "fun", "bowling", "party"],
        "Health": ["pharmacy", "doctor", "dentist", "hospital", "gym", "fitness", "yoga", "medication", "drug", "clinic", "health", "insurance"],
        "Utilities": ["bill", "water", "electric", "power", "internet", "wifi", "phone", "mobile", "verizon", "att", "t-mobile", "rent", "subscription"],
        "Income": ["salary", "paycheck", "freelance", "upwork", "fiverr", "deposit", "transfer", "refund", "bonus"]
    }
    
    for category, words in keywords.items():
        for word in words:
            if word in text:
                return category
    
    return "General" # Default if no match found

# ==========================================
# 3. APP SETUP
# ==========================================
app = FastAPI(title="ONYX API", version="2.2.0", lifespan=lifespan)

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

@app.get("/", status_code=status.HTTP_200_OK)
def root():
    return {"system": "ONYX Financial Intelligence", "status": "operational", "ai": "active"}

# NEW: The Prediction Endpoint
@app.post("/predict")
def predict(request: PredictionRequest):
    category = predict_category(request.text)
    return {"category": category}

@app.get("/transactions", response_model=List[Transaction])
def get_transactions(session: Session = Depends(get_session)):
    statement = select(Transaction).order_by(Transaction.id.desc())
    return session.exec(statement).all()

@app.post("/transactions", response_model=Transaction, status_code=status.HTTP_201_CREATED)
def add_transaction(transaction: Transaction, session: Session = Depends(get_session)):
    try:
        session.add(transaction)
        session.commit()
        session.refresh(transaction)
        return transaction
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="Database Error")

@app.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int, session: Session = Depends(get_session)):
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    session.delete(transaction)
    session.commit()
    return None