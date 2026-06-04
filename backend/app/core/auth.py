from requests.auth import HTTPBasicAuth

from app.core.config import pat

auth = HTTPBasicAuth("", pat)