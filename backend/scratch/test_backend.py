import requests
import json

base_url = "http://127.0.0.1:8000/api"

def test_backend():
    projects = ['ANPR', 'AiDocFlo', 'TestDevOps', 'TimeFlow']
    for project in projects:
        url = f"{base_url}/projects/{project}/workitems"
        try:
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                data = res.json()
                count = data.get("count", 0)
                sprints = data.get("sprints", [])
                value = data.get("value", [])
                print(f"Project: {project}")
                print(f"  Status: {res.status_code}")
                print(f"  Success: {data.get('success')}")
                print(f"  Count: {count}")
                print(f"  Sprints: {sprints}")
                if value:
                    print(f"  First work item sample ID: {value[0]['id']}, Title: {value[0]['fields'].get('System.Title')}")
            else:
                print(f"Project: {project} -> Status Code: {res.status_code}, Response: {res.text}")
        except Exception as e:
            print(f"Project: {project} -> Error: {e}")

if __name__ == "__main__":
    test_backend()
