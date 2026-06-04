import json

with open("config.json", "r") as f:
    config = json.load(f)

base_url = config["azure_devops_url"]
collection = config["azure_collection_name"]
pat = config["azure_pat"]