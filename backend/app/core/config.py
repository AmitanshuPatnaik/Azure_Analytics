import json
import os

try:
    with open("config.json", "r") as f:
        content = f.read().strip()
        config = json.loads(content) if content else {}
except Exception:
    config = {}

base_url = config.get("azure_devops_url", "")
collection = config.get("azure_collection_name", "")
pat = config.get("azure_pat", "")

email = config.get("email", "")
password = config.get("password", "")

secret = config.get("JWT_SECRET_KEY", "fallback-secret-for-dev")
algorithm = config.get("JWT_ALGORITHM", "HS256")
# Handle expiry dynamically, checking if it is an int/string or defaulting to 60
try:
    expiry = int(config.get("JWT_EXPIRATION_MINUTES", 60))
except (ValueError, TypeError):
    expiry = 60

tenant_id = config.get("AZURE_TENANT_ID", "")
client_id = config.get("AZURE_CLIENT_ID", "")
client_secret = config.get("AZURE_CLIENT_SECRET", "")
azure_cost_base_url = config.get("azure_cost_base_url", "")
azure_management_base_url = config.get("azure_management_base_url", "")