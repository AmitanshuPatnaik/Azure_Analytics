import os
from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient

load_dotenv()

connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")

blob_service_client = BlobServiceClient.from_connection_string(connection_string)

def get_containers():

    containers = []

    for container in blob_service_client.list_containers():

        containers.append({
            "name": container.name,
            "last_modified": str(container.last_modified)
        })

    return {
        "success": True,
        "count": len(containers),
        "containers": containers
    }


print(get_containers())


def get_account_info():

    account = blob_service_client.get_service_properties()

    return {
        "success": True,
        "properties": str(account)
    }

print(get_account_info())