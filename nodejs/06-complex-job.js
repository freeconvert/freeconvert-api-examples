const axios = require("axios");
const { io } = require("socket.io-client");

// You can generate FreeConvert API key from your user account dashboard.
// Read more at FreeConvert API reference docs: https://www.freeconvert.com/api/v1/
const apiKey = "my_api_key";

const freeconvert = axios.create({
    baseURL: "https://api.freeconvert.com/v1",
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${apiKey}`,
    },
});

async function app() {
    //
    // Initialize a websocket connection to receive real time updates about the job.
    // Read more: https://www.freeconvert.com/api/v1/#freeconvert-com-api-socket
    //
    const socket = io("https://notification.freeconvert.com/", {
        transports: ["websocket"],
        path: "/socket.io",
        auth: { token: `Bearer ${apiKey}` },
    });

    // This job achieves the following:
    //
    // Generate a PDF containing 3 images as 3 pages.
    //      page 1 contains a screenshot of freeconvert.com website.
    //      page 2 contains a transparent png image of a dice roll
    //      page 3 contains a jpg image of a tree.
    // Generate a small thumbnail of the dice roll image with orange background.
    // Archive the PDF and the thumbnail to a zip package.
    //
    // Check out FreeConvert Job Builder to help build complex workflows: https://www.freeconvert.com/api/job-builder

    const jobResponse = await freeconvert.post("/process/jobs", {
        tasks: {
            // Import FreeConvert webpage.
            fcWebpage: {
                operation: "import/webpage",
                url: "https://www.freeconvert.com",
            },
            // Convert the webpage to a png.
            webpageScreenshot: {
                operation: "convert",
                input: "fcWebpage",
                output_format: "png",
                options: {
                    viewport_width: 300,
                    png_compression_level: "lossy",
                    png_convert_quality: 80,
                },
            },

            // Import an image of dice roll.
            diceImage: {
                operation: "import/url",
                url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png",
            },

            // Import an image of a tree.
            treeImage: {
                operation: "import/url",
                url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Larix_decidua_Aletschwald.jpg/800px-Larix_decidua_Aletschwald.jpg",
            },

            // Merge the 3 images to a PDF.
            mergedPdf: {
                operation: "merge",
                input: ["webpageScreenshot", "diceImage", "treeImage"],
                output_format: "pdf",
                options: {
                    pdf_page_size: "1240.2x1753.95",
                    pdf_orientation: "portrait",
                    pdf_image_alignment: "Center",
                    enlarge_images_to_fit: true,
                },
            },

            // Convert dice image to a small jpg to be used as a thumbnail with orange background.
            thumbnail: {
                operation: "convert",
                input: "diceImage",
                output_format: "jpg",
                options: {
                    image_resize_percentage: 60,
                    background: "#FF9900",
                    jpg_convert_compression_level: 80,
                },
            },
            // Export the thumbnail to get the desired filename (instead of auto-generated GUID filename).
            thumbnailExport: {
                operation: "export/url",
                input: "thumbnail",
                filename: "Thumbnail.jpg",
            },

            // Final export of the thumbnail and the PDF as a Zip archive.
            finalExport: {
                operation: "export/url",
                input: ["thumbnailExport", "mergedPdf"],
                archive_multiple_files: true,
                filename: "FinalPackage.zip",
            },
        },
    });
    const jobId = jobResponse.data.id;
    console.log("Created job", jobId);
    console.log("Waiting for job updates....");

    // Register for success and failure events.

    socket.on("task_started", (data) => {
        console.log("Task started", data.name);
    });

    socket.on("task_completed", (data) => {
        console.log("Task completed", data.name);
        socket.emit("unsubscribe", `task.${data.id}`);
    });

    socket.on("task_failed", (data) => {
        console.log("Task failed", data.name);
        socket.emit("unsubscribe", `task.${data.id}`);
    });

    socket.on("job_completed", (data) => {
        console.log("Job completed", data.id);
        socket.emit("unsubscribe", `job.${data.id}`);
        socket.disconnect();

        //
        // Job completed means, all tasks succeeded.
        //
        displaySuccessResults(data.id);
    });

    socket.on("job_failed", (data) => {
        console.log("Job failed", data.id);
        socket.emit("unsubscribe", `job.${data.id}`);
        socket.disconnect();
    });

    // Subscribe to the job and also its children tasks.
    socket.emit("subscribe", `job.${jobId}`);
    jobResponse.data.tasks.forEach((task) => {
        socket.emit("subscribe", `task.${task.id}`);
    });
}

async function displaySuccessResults(jobId) {
    console.log("Fetching final result...");
    const jobGetResponse = await freeconvert.get(`/process/jobs/${jobId}`);
    const job = jobGetResponse.data;

    const exportTask = job.tasks.find((t) => t.name === "finalExport");
    console.log(exportTask.result.url);
}

app().catch((error) => console.log(error.message));
