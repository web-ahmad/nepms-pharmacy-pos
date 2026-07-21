import sys
import os
from a2wsgi import ASGIMiddleware

sys.path.insert(0, os.path.dirname(__file__))

from main import app # assuming main.py has the FastAPI instance named 'app'
application = ASGIMiddleware(app)
