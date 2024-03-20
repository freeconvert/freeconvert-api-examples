import os
import requests
import time

# You can generate FreeConvert API key from your user account dashboard.
# Read more at FreeConvert API reference docs: https://www.freeconvert.com/api/v1/
api_key = "my_api_key"
base_url = "https://api.freeconvert.com/v1"

freeconvert = requests.Session()
freeconvert.headers.update({
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": f"Bearer {api_key}"
})

def polling_example1():
    print("polling example 1")

    #
    # Create a single task and check for its status until completion
    #
    task_response = freeconvert.post(f"{base_url}/process/import/url", json={
        "url": "https://cdn.freeconvert.com/logo_theme.svg",
        "filename": "logo.svg",
    })
    task_id = task_response.json().get("id")
    print("Task created", task_id)

    for i in range(10):
        # Need to repeatedly call this API until completion.
        time.sleep(2)
        task_get_response = freeconvert.get(f"{base_url}/process/tasks/{task_id}")

        task = task_get_response.json()
        print("Task status:", task["status"])

        if task["status"] in ["completed", "failed"]:
            print("Polling ended. status:", task["status"])
            return

    print("Polling timed out.")

def polling_example2():
    print("polling example 2")

    #
    # Create a job and check for its status until completion.
    # Job will complete when all its children tasks are complete.
    #
    job_response = freeconvert.post(f"{base_url}/process/jobs", json={
        "tasks": {
            "myImport1": {
                "operation": "import/url",
                "url": "https://cdn.freeconvert.com/logo_theme.svg",
                "filename": "logo.svg",
            },
            "myConvert1": {
                "operation": "convert",
                "input": "myImport1",
                "output_format": "jpg",
                "options": {
                    "background": "#FFFFFF",
                },
            },
            "myExport1": {
                "operation": "export/url",
                "input": "myConvert1",
                "filename": "my-converted-file.jpg",
            },
        },
    })
    job_id = job_response.json().get("id")
    print("Job created", job_id)

    for i in range(10):
        # Need to repeatedly call this API until status is 'completed'.
        # Job will complete when all its children tasks are complete.
        time.sleep(2)
        job_get_response = freeconvert.get(f"{base_url}/process/jobs/{job_id}")

        job = job_get_response.json()
        print("Job status:", job["status"])

        if job["status"] in ["completed", "failed"]:
            print("Polling ended. status:", job["status"])

            if job["status"] == "completed":
                # After ensuring job is complete, we can download the desired result.
                export_task = next((t for t in job["tasks"] if t["name"] == "myExport1"), None)
                if export_task:
                    print("Downloadable converted file url:", export_task["result"]["url"])

            return

    print("Polling timed out.")

def app():
    polling_example1()
    polling_example2()

if __name__ == "__main__":
    try:
        app()
    except Exception as e:
        print(e)
