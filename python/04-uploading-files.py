import os
import asyncio
import requests
import time

# You can generate FreeConvert API key from your user account dashboard.
# Read more at FreeConvert API reference docs: https://www.freeconvert.com/api/v1/
api_key = "my_api_key"
base_url = "https://api.freeconvert.com/v1"
upload_file_path = "myvideo.mp4"

freeconvert = requests.Session()
freeconvert.headers.update({
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": f"Bearer {api_key}",
})

def upload_example1():
    print("upload example 1")

    # Create an import/upload task
    upload_task_response = freeconvert.post(f"{base_url}/process/import/upload")
    upload_task_id = upload_task_response.json()["id"]
    uploader_form = upload_task_response.json()["result"]["form"]
    print("Created task", upload_task_id)

    # Attach required form parameters and the file
    formdata = {}
    for parameter, value in uploader_form["parameters"].items():
        formdata[parameter] = value
    files = {'file': open(upload_file_path,'rb')}

    # Submit the upload as multipart/form-data request.
    upload_response = requests.post(uploader_form["url"], files=files, data=formdata)
    upload_response.raise_for_status()

    # Use the uploaded file in a job.
    # Job will complete when all its children and dependent tasks are complete.
    job_response = freeconvert.post(f"{base_url}/process/jobs", json={
        "tasks": {
            "myConvert1": {
                "operation": "convert",
                "input": upload_task_id,
                "output_format": "mp3",
            },
            "myExport1": {
                "operation": "export/url",
                "input": "myConvert1",
                "filename": "my-converted-file.mp3",
            },
        },
    })
    job = job_response.json()
    print("Job created", job["id"])

    # Job will proceed as soon as the upload is finished.
    # We need to wait for job completion/failure using polling or websocket (see relevant code examples).
    wait_for_job_by_polling(job["id"])

def upload_example2():
    print("upload example 2")

    # Upload, convert, export all inside same job
    job_response = freeconvert.post(f"{base_url}/process/jobs", json={
        "tasks": {
            "myUpload1": {
                "operation": "import/upload",
            },
            "myConvert1": {
                "operation": "convert",
                "input": "myUpload1",
                "output_format": "mp3",
            },
            "myExport1": {
                "operation": "export/url",
                "input": "myConvert1",
                "filename": "my-converted-file.mp3",
            },
        },
    })
    job = job_response.json()
    print("Job created", job["id"])

    # Attach required form parameters and the file for file upload.
    upload_task = next(task for task in job["tasks"] if task["name"] == "myUpload1")
    uploader_form = upload_task["result"]["form"]
    formdata = {}
    for parameter, value in uploader_form["parameters"].items():
        formdata[parameter] = value
    files = {'file': open(upload_file_path,'rb')}

    # Submit the upload as multipart/form-data request.
    upload_response = requests.post(uploader_form["url"], files=files, data=formdata)
    upload_response.raise_for_status()

    # Job will proceed as soon as the upload is finished.
    # We need to wait for job completion/failure using polling or websocket (see relevant code examples).
    wait_for_job_by_polling(job["id"])

def wait_for_job_by_polling(job_id):
    for _ in range(10):
        time.sleep(2)
        job_get_response = freeconvert.get(f"{base_url}/process/jobs/{job_id}")
        job = job_get_response.json()

        if job["status"] == "completed":
            export_task = next(task for task in job["tasks"] if task["name"] == "myExport1")
            print("Downloadable converted file url:", export_task["result"]["url"])
            return
        elif job["status"] == "failed":
            raise Exception("Job failed")

    raise Exception("Poll timeout")

def app():
    upload_example1()
    upload_example2()

if __name__ == "__main__":
    try:
        app()
    except Exception as e:
        print(e)