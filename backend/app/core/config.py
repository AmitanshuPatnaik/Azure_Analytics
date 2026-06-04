import json

with open("config.json", "r") as f:
    config = json.load(f)

base_url = config["azure_devops_url"]
collection = config["azure_collection_name"]
pat = config["azure_pat"]

email = config["email"]
password = config["password"]

secret = config["JWT_SECRET_KEY"]
algorithm = config["JWT_ALGORITHM"]
expiry = config["JWT_EXPIRATION_MINUTES"]

tenant_id = config["AZURE_TENANT_ID"]
client_id = config["AZURE_CLIENT_ID"]
client_secret = config["AZURE_CLIENT_SECRET"]