from database import SessionLocal
from models.accounts import Account

db = SessionLocal()

# Find the empty Sales Returns with code 5010
acc_to_delete = db.query(Account).filter(Account.code == '5010', Account.name == 'Sales Returns').first()

if acc_to_delete:
    print(f"Deleting account {acc_to_delete.id} - {acc_to_delete.name} ({acc_to_delete.code})")
    db.delete(acc_to_delete)
    db.commit()
    print("Deleted successfully.")
else:
    print("Account not found.")
