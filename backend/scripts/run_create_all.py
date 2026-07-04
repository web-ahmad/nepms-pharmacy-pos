import sys
import os

# Add parent directory of scripts to path so we can import database and models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, engine
import models # imports __init__.py which has all models

print("Calling Base.metadata.create_all...")
Base.metadata.create_all(bind=engine)
print("Create_all completed successfully.")
