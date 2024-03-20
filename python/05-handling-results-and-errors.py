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

def app():
    
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
                # Deliberately treat the input file as 'mp4' to cause a failure. (the input file is actually a 'svg' image)
                "input_format": "mp4",
                "output_format": "mp3",
            },
            "myExport1": {
                "operation": "export/url",
                "input": "myConvert1",
            },
        }
    })
    job_response.raise_for_status()
    job_id = job_response.json()["id"]
    print("Created job", job_id)

    job = wait_for_job_by_polling(job_id)

    # Print any success or failure results:
    if job["status"] == "completed":
        print("Job completed.")
    else:
        print(f"Job failed. [{job['result']['errorCode']}] - {job['result']['msg'].strip()}")

    for t in job["tasks"]:
        if t["status"] == "completed":
            print(f"Task {t['name']} completed. result.url: {t['result']['url']}")
        else:
            print(f"Task {t['name']} failed. [{t['result']['errorCode']}] - {t['result']['msg'].strip()}")

def wait_for_job_by_polling(job_id):
    for _ in range(10):
        time.sleep(2)
        job_get_response = freeconvert.get(f"{base_url}/process/jobs/{job_id}")
        job_get_response.raise_for_status()
        job = job_get_response.json()
        if job["status"] == "completed" or job["status"] == "failed":
            # Return the latest job information.
            return job
    raise TimeoutError("Poll timeout")

if __name__ == "__main__":
    try:
        app()
    except Exception as e:
        print(e)