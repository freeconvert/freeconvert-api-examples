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

async def app():
    #
    # Initialize a websocket connection to FreeConvert notification service, using socket.io client library.
    # Read more: https://www.freeconvert.com/api/v1/#freeconvert-com-api-socket
    #
    sio = socketio.Client()
    sio.connect("https://notification.freeconvert.com", transports=["websocket"],  auth={"token": f"Bearer {api_key}"})

    # Event to signal when all is completed
    listening_finished = asyncio.Event()

    # This job achieves the following:
    #
    # Generate a PDF containing 3 images as 3 pages.
    #      page 1 contains a screenshot of freeconvert.com website.
    #      page 2 contains a transparent png image of a dice roll
    #      page 3 contains a jpg image of a tree.
    # Generate a small thumbnail of the dice roll image with orange background.
    # Archive the PDF and the thumbnail to a zip package.
    #
    # Check out FreeConvert Job Builder to help build complex workflows: https://www.freeconvert.com/api/job-builder

    job_response = freeconvert.post(f"{base_url}/process/jobs", json={
        "tasks": {
            # Import FreeConvert webpage.
            "fcWebpage": {
                "operation": "import/webpage",
                "url": "https://www.freeconvert.com",
            },
            # Convert the webpage to a png.
            "webpageScreenshot": {
                "operation": "convert",
                "input": "fcWebpage",
                "output_format": "png",
                "options": {
                    "viewport_width": 300,
                    "png_compression_level": "lossy",
                    "png_convert_quality": 80,
                },
            },
            # Import an image of dice roll.
            "diceImage": {
                "operation": "import/url",
                "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png",
            },
            # Import an image of a tree.
            "treeImage": {
                "operation": "import/url",
                "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Larix_decidua_Aletschwald.jpg/800px-Larix_decidua_Aletschwald.jpg",
            },
            # Merge the 3 images to a PDF.
            "mergedPdf": {
                "operation": "merge",
                "input": ["webpageScreenshot", "diceImage", "treeImage"],
                "output_format": "pdf",
                "options": {
                    "pdf_page_size": "1240.2x1753.95",
                    "pdf_orientation": "portrait",
                    "pdf_image_alignment": "Center",
                    "enlarge_images_to_fit": True,
                },
            },
            # Convert dice image to a small jpg to be used as a thumbnail with orange background.
            "thumbnail": {
                "operation": "convert",
                "input": "diceImage",
                "output_format": "jpg",
                "options": {
                    "image_resize_percentage": 60,
                    "background": "#FF9900",
                    "jpg_convert_compression_level": 80,
                },
            },
            # Export the thumbnail to get the desired filename (instead of auto-generated GUID filename).
            "thumbnailExport": {
                "operation": "export/url",
                "input": "thumbnail",
                "filename": "Thumbnail.jpg",
            },
            # Final export of the thumbnail and the PDF as a Zip archive.
            "finalExport": {
                "operation": "export/url",
                "input": ["thumbnailExport", "mergedPdf"],
                "archive_multiple_files": True,
                "filename": "FinalPackage.zip",
            },
        }
    })
    job_response.raise_for_status()

    job = job_response.json()
    job_id = job["id"]
    print("Created job", job_id)
    print("Waiting for job updates....")

    @sio.on("task_started")
    def on_task_started(data):
        print("Task started", data["name"])

    @sio.on("task_completed")
    def on_task_completed(data):
        print("Task completed", data["name"])
        sio.emit("unsubscribe", f"task.{data['id']}")

    @sio.on("task_failed")
    def on_task_failed(data):
        print("Task failed", data["name"])
        sio.emit("unsubscribe", f"task.{data['id']}")

    @sio.on("job_completed")
    def on_job_completed(data):
        print("Job completed", data["id"])
        sio.emit("unsubscribe", f"job.{data['id']}")
        sio.disconnect()
        listening_finished._loop.call_soon_threadsafe(listening_finished.set)

    @sio.on("job_failed")
    def on_job_failed(data):
        print("Job failed", data["id"])
        sio.emit("unsubscribe", f"job.{data['id']}")
        sio.disconnect()
        listening_finished._loop.call_soon_threadsafe(listening_finished.set)

    # Subscribe to the job and also its children tasks.
    sio.emit("subscribe", f"job.{job_id}")
    for task in job["tasks"]:
        taskId = task["id"]
        sio.emit("subscribe", f"task.{taskId}")

    await listening_finished.wait()

    display_results(job["id"])

def display_results(job_id):
    job_get_response = freeconvert.get(f"{base_url}/process/jobs/{job_id}")
    job = job_get_response.json()

    if job["status"] == "completed":
        export_task = next((t for t in job["tasks"] if t["name"] == "finalExport"), None)
        if export_task:
            print(export_task["result"]["url"])

if __name__ == "__main__":
    try:
        asyncio.run(app())
    except Exception as e:
        print(e)