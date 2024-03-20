const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

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

async function uploadExample1() {
    console.log("upload example 1");

    //
    // Create an import/upload task
    const uploadTaskResponse = await freeconvert.post("/process/import/upload");
    const uploadTaskId = uploadTaskResponse.data.id;
    const uploaderForm = uploadTaskResponse.data.result.form;
    console.log("Created task", uploadTaskId);

    // Attach required form parameters and the file
    const formData = new FormData();
    for (const parameter in uploaderForm.parameters) {
        formData.append(parameter, uploaderForm.parameters[parameter]);
    }

    formData.append("file", fs.createReadStream("myvideo.mp4"));

    // Submit the upload as multipart/form-data request.
    await axios.post(uploaderForm.url, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    // Use the uploaded file in a job.
    // Job will complete when all its children and dependent tasks are complete.
    const jobResponse = await freeconvert.post("/process/jobs", {
        tasks: {
            myConvert1: {
                operation: "convert",
                input: uploadTaskId,
                output_format: "mp3",
            },
            myExport1: {
                operation: "export/url",
                input: "myConvert1",
                filename: "my-converted-file.mp3",
            },
        },
    });
    const job = jobResponse.data;
    console.log("Job created", job.id);

    // Job will proceed as soon as the upload is finished.
    // We need to wait for job completion/failure using polling or websocket (see relevant code examples).
    await waitForJobByPolling(job.id);
}

async function uploadExample2() {
    console.log("upload example 2");

    //
    // Upload, convert, export all inside same job
    //
    const jobResponse = await freeconvert.post("/process/jobs", {
        tasks: {
            myUpload1: {
                operation: "import/upload",
            },
            myConvert1: {
                operation: "convert",
                input: "myUpload1",
                output_format: "mp3",
            },
            myExport1: {
                operation: "export/url",
                input: "myConvert1",
                filename: "my-converted-file.mp3",
            },
        },
    });
    const job = jobResponse.data;
    console.log("Job created", job.id);

    // Attach required form parameters and the file for file upload.

    const uploadTask = job.tasks.find((t) => t.name === "myUpload1");

    const formData = new FormData();
    for (const parameter in uploadTask.result.form.parameters) {
        formData.append(parameter, uploadTask.result.form.parameters[parameter]);
    }

    formData.append("file", fs.createReadStream("myvideo.mp4"));

    // Submit the upload as multipart/form-data request.
    await axios.post(uploadTask.result.form.url, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    // Job will proceed as soon as the upload is finished.
    // We need to wait for job completion/failure using polling or websocket (see relevant code examples).
    await waitForJobByPolling(job.id);
}

async function waitForJobByPolling(jobId) {
    for (let i = 0; i < 10; i++) {
        await waitForSeconds(2);
        const jobGetResponse = await freeconvert.get(`/process/jobs/${jobId}`);

        const job = jobGetResponse.data;

        if (job.status === "completed") {
            const exportTask = job.tasks.find((t) => t.name === "myExport1");
            console.log("Downloadable converted file url:", exportTask.result.url);
            return;
        } else if (job.status === "failed") {
            throw new Error("Job failed");
        }
    }

    throw new Error("Poll timeout");
}

async function waitForSeconds(seconds) {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function app() {
    await uploadExample1();
    await uploadExample2();
}

app().catch((error) => console.log(error.message));
