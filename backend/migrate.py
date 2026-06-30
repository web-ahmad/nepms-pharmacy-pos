from database import engine, Base; import models.settings; Base.metadata.create_all(bind=engine)
