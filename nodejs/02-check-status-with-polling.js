const axios = require("axios");

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

async function pollingExample1() {
    console.log("polling example 1");

    //
    // Create a single task and check for its status until completion
    //
    const taskResponse = await freeconvert.post("/process/import/url", {
        url: "https://cdn.freeconvert.com/logo_theme.svg",
        filename: "logo.svg",
    });
    const taskId = taskResponse.data.id;
    console.log("Task created", taskId);

    for (let i = 0; i < 10; i++) {
        // Need to repeatedly call this api until completion.
        await waitForSeconds(2);
        const taskGetResponse = await freeconvert.get(`/process/tasks/${taskId}`);

        const task = taskGetResponse.data;
        console.log("Task status:", task.status);

        if (task.status === "completed" || task.status === "failed") {
            console.log("Polling ended. status:", task.status);
            return;
        }
    }

    console.log("Polling timed out.");
}

async function pollingExample2() {
    console.log("polling example 2");

    //
    // Create a job and check for its status until completion.
    // Job will complete when all its children tasks are complete.
    //
    const jobResponse = await freeconvert.post("/process/jobs", {
        tasks: {
            myImport1: {
                operation: "import/url",
                url: "https://cdn.freeconvert.com/logo_theme.svg",
                filename: "logo.svg",
            },
            myConvert1: {
                operation: "convert",
                input: "myImport1",
                output_format: "jpg",
                options: {
                    background: "#FFFFFF",
                },
            },
            myExport1: {
                operation: "export/url",
                input: "myConvert1",
                filename: "my-converted-file.jpg",
            },
        },
    });
    const jobId = jobResponse.data.id;
    console.log("Job created", jobId);

    for (let i = 0; i < 10; i++) {
        // Need to repeatedly call this api until status is 'completed'.
        // Job will complete when all its children tasks are complete.
        await waitForSeconds(2);
        const jobGetResponse = await freeconvert.get(`/process/jobs/${jobId}`);

        const job = jobGetResponse.data;
        console.log("Job status:", job.status);

        if (job.status === "completed" || job.status === "failed") {
            console.log("Polling ended. status:", job.status);

            if (job.status === "completed") {
                // After ensuring job is complete, we can download the desired result.
                const exportTask = job.tasks.find((t) => t.name === "myExport1");
                console.log("Downloadable converted file url:", exportTask.result.url);
            }
            return;
        }
    }

    console.log("Polling timed out.");
}

async function waitForSeconds(seconds) {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function app() {
    await pollingExample1();
    await pollingExample2();
}

app().catch((error) => console.log(error.message));
