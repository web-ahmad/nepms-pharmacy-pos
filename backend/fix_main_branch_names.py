import os
import sys

# Add the project directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from models.users import Branch, Pharmacy

db = SessionLocal()

try:
    # Find all branches named "Main Pharmacy"
    main_branches = db.query(Branch).filter(Branch.name == "Main Pharmacy").all()
    count = 0
    for branch in main_branches:
        # Find the pharmacy associated with this branch's tenant
        pharmacy = db.query(Pharmacy).filter(Pharmacy.tenant_id == branch.tenant_id).first()
        if pharmacy:
            print(f"Updating branch ID {branch.id} name from 'Main Pharmacy' to '{pharmacy.name}'")
            branch.name = pharmacy.name
            count += 1
            
    if count > 0:
        db.commit()
        print(f"Successfully updated {count} main branches!")
    else:
        print("No branches named 'Main Pharmacy' found.")
finally:
    db.close()
