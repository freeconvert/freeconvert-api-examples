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

async function app() {
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

                //
                // Deliberately treat the input file as 'mp4' to cause a failure. (the input file is actually a 'svg' image)
                //
                input_format: "mp4",
                output_format: "mp3",
            },
            myExport1: {
                operation: "export/url",
                input: "myConvert1",
            },
        },
    });
    const jobId = jobResponse.data.id;
    console.log("Created job", jobId);

    const job = await waitForJobByPolling(jobId);

    // Print any success or failure results:

    if (job.status === "completed") {
        console.log("Job completed.");
    } else {
        console.log(`Job failed. [${job.result.errorCode}] - ${job.result.msg.trim()}`);
    }

    for (const t of job.tasks) {
        if (t.status === "completed") {
            console.log(`Task ${t.name} completed. result.url: ${t.result.url}`);
        } else {
            console.log(`Task ${t.name} failed. [${t.result.errorCode}] - ${t.result.msg.trim()}`);
        }
    }
}

async function waitForJobByPolling(jobId) {
    for (let i = 0; i < 10; i++) {
        await waitForSeconds(2);
        const jobGetResponse = await freeconvert.get(`/process/jobs/${jobId}`);

        const job = jobGetResponse.data;
        if (job.status === "completed" || job.status === "failed") {
            // Return the latest job information.
            return job;
        }
    }

    throw new Error("Poll timeout");
}

async function waitForSeconds(seconds) {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

app().catch((error) => console.log(error.message));
