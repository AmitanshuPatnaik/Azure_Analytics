import requests
from requests.auth import HTTPBasicAuth
import urllib3
import os
from dotenv import load_dotenv

from Azure_Devops.projects import fetch_projects

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

load_dotenv()

base_url = os.getenv("AZURE_DEVOPS_URL")
collection = os.getenv("AZURE_COLLECTION_NAME")
pat = os.getenv("AZURE_PAT")

auth =  HTTPBasicAuth("", pat)


def fetch_pipelines(project_name):
    url = f"{base_url}/{collection}/{project_name}/_apis/pipelines?api-version=7.1"

    response = requests.get(url=url, auth=auth, verify=False)

    if response.status_code != 200:
        return {
            "success" : False,
            "status_code" : response.status_code,
            "error" : response.text
        }
    
    pipelines = []

    for pipeline in response.json()["value"]:
        pipelines.append({
            "id" : pipeline["id"],
            "name" : pipeline["name"],
            "folder" : pipeline.get("folder")
        })

    return {
        "success" : True,
        "count" : len(pipelines),
        "pipelines" : pipelines
    }