import os
import asyncio
import requests
import socketio

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

async def websocket_example1():

    print("websocket example 1")

    #
    # Initialize a websocket connection to FreeConvert notification service, using socket.io client library.
    # Read more: https://www.freeconvert.com/api/v1/#freeconvert-com-api-socket
    #
    sio = socketio.Client()
    sio.connect("https://notification.freeconvert.com", transports=["websocket"],  auth={"token": f"Bearer {api_key}"})

    # Event to signal when all is completed
    listening_finished = asyncio.Event()

    # Create a single task
    task_response = freeconvert.post(f"{base_url}/process/import/url", json={
        "url": "https://cdn.freeconvert.com/logo_theme.svg",
        "filename": "logo.svg"
    }).json()
    task_id = task_response["id"]
    

    # Watch for task completion event
    @sio.on("task_completed")
    def on_task_completed(data):
        print("Task completed", data["id"])
        # Unsubscribe when no longer needed
        sio.emit("unsubscribe", f"task.{data['id']}")
        sio.disconnect()
        listening_finished._loop.call_soon_threadsafe(listening_finished.set)

    # Subscribe to events of the created task
    print("Start waiting for task", task_id)
    sio.emit("subscribe", f"task.{task_id}")

    await listening_finished.wait()

async def websocket_example2():

    print("websocket example 2")
    
    # Initialize a websocket connection to FreeConvert notification service.
    # Create a job and watch for its completion event.
    sio = socketio.Client()
    sio.connect("https://notification.freeconvert.com", transports=["websocket"],  auth={"token": f"Bearer {api_key}"})

    # Event to signal when all is completed
    listening_finished = asyncio.Event()

    # Create a job
    job_response = freeconvert.post(f"{base_url}/process/jobs", json={
        "tasks": {
            "myImport1": {
                "operation": "import/url",
                "url": "https://cdn.freeconvert.com/logo_theme.svg",
                "filename": "logo.svg"
            },
            "myConvert1": {
                "operation": "convert",
                "input": "myImport1",
                "output_format": "jpg"
            },
            "myExport1": {
                "operation": "export/url",
                "input": "myConvert1",
                "filename": "my-converted-file.jpg"
            }
        }
    }).json()
    job_id = job_response["id"]

    # Watch for task and job completion events
    @sio.on("task_completed")
    def on_task_completed(data):
        print("Task completed", data["name"])
        # Unsubscribe when no longer needed
        sio.emit("unsubscribe", f"task.{data['id']}")

    @sio.on("job_completed")
    def on_job_completed(data):
        print("Job completed", data["id"])
        # Unsubscribe when no longer needed
        sio.emit("unsubscribe", f"job.{data['id']}")
        sio.disconnect()
        listening_finished._loop.call_soon_threadsafe(listening_finished.set)

    # Subscribe to events of the created job
    print("Start waiting for job", job_id)
    sio.emit("subscribe", f"job.{job_id}")

    # Subscribe to all tasks in the job
    for task in job_response["tasks"]:
        sio.emit("subscribe", f"task.{task['id']}")

    await listening_finished.wait()

async def app():
    await websocket_example1()
    await websocket_example2()

if __name__ == "__main__":
    try:
        asyncio.run(app())
    except Exception as e:
        print(e)
