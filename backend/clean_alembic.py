import re
path = "C:/Users/DEVJiX/Desktop/NEPMS/backend/alembic/versions/2fbec8a65272_enterprise_purchase_upgrade.py"
with open(path, "r") as f:
    lines = f.readlines()

out = []
for line in lines:
    if "drop_constraint(None" in line:
        continue
    if "drop_column('pharmacy_id')" in line:
        continue
    out.append(line)

with open(path, "w") as f:
    f.writelines(out)
