import json
import os

# Resolve config.json relative to this file's directory (backend/app/core/),
# going two levels up to backend/ regardless of the working directory.
_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "config.json")

try:
    with open(_CONFIG_PATH, "r") as f:
        content = f.read().strip()
        config = json.loads(content) if content else {}
except Exception:
    config = {}

base_url = config.get("azure_devops_url", "")
collection = config.get("azure_collection_name", "")
pat = config.get("azure_pat", "")

username = config.get("username", "")
password = config.get("password", "")

secret = config.get("JWT_SECRET_KEY", "fallback-secret-for-dev")
algorithm = config.get("JWT_ALGORITHM", "HS256")
# Handle expiry dynamically, checking if it is an int/string or defaulting to 60
try:
    expiry = int(config.get("JWT_EXPIRATION_MINUTES", 60))
except (ValueError, TypeError):
    expiry = 60

doc_flow_tenant_id = config.get("DOC_FLOW_TENANT_ID", "")
doc_flow_client_id = config.get("DOC_FLOW_CLIENT_ID", "")
doc_flow_client_secret = config.get("DOC_FLOW_CLIENT_SECRET", "")

time_flow_tenant_id = config.get("TIME_FLOW_TENANT_ID", "")
time_flow_client_id = config.get("TIME_FLOW_CLIENT_ID", "")
time_flow_client_secret = config.get("TIME_FLOW_CLIENT_SECRET", "")

integrelity_tenant_id = config.get("INTEGRELITY_TENANT_ID", "")
integrelity_client_id = config.get("INTEGRELITY_CLIENT_ID", "")
integrelity_client_secret = config.get("INTEGRELITY_CLIENT_SECRET", "")

azure_cost_base_url = config.get("azure_cost_base_url", "")
azure_management_base_url = config.get("azure_management_base_url", "")