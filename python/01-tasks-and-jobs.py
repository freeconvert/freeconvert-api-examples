import os
import requests

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

def app():
    # Create a single task
    task_response1 = freeconvert.post(f"{base_url}/process/import/url", json={
        "url": "https://cdn.freeconvert.com/logo_theme.svg",
        "filename": "logo.svg",
    })
    task_id1 = task_response1.json().get("id")
    print("Created task1", task_id1)

    # Create a group of tasks inside a Job
    job_response1 = freeconvert.post(f"{base_url}/process/jobs", json={
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
                    # Read more on advanced options: https://www.freeconvert.com/api/v1/#freeconvert-com-api-advanced-options
                    "background": "#FFFFFF",
                    "image_custom_width": 100,
                    "image_custom_height": 100,
                },
            },
            "myExport1": {
                "operation": "export/url",
                "input": "myConvert1",
                "filename": "my-converted-file.jpg",
            },
        },
    })
    print("Created job1", job_response1.json().get("id"))

    # Create a single task referring to another task
    convert_task_response = freeconvert.post(f"{base_url}/process/convert", json={
        "input": task_id1,
        "output_format": "jpg",
        "options": {
            "background": "#FFFFFF",
        },
    })
    print("Created task2", convert_task_response.json().get("id"))

    # Create a job referring to another task
    job_response2 = freeconvert.post(f"{base_url}/process/jobs", json={
        "tasks": {
            "myConvert1": {
                "operation": "convert",
                "input": task_id1,
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
    print("Created job2", job_response2.json().get("id"))

if __name__ == "__main__":
    try:
        app()
    except Exception as e:
        print(e)
