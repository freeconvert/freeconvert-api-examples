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
    // Create a single task
    const taskResponse1 = await freeconvert.post("/process/import/url", {
        url: "https://cdn.freeconvert.com/logo_theme.svg",
        filename: "logo.svg",
    });
    const taskId1 = taskResponse1.data.id;
    console.log("Created task1", taskId1);

    // Create a group of tasks inside a Job
    const jobResponse1 = await freeconvert.post("/process/jobs", {
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
                    // Read more on advanced options: https://www.freeconvert.com/api/v1/#freeconvert-com-api-advanced-options
                    background: "#FFFFFF",
                    image_custom_width: 100,
                    image_custom_height: 100,
                },
            },
            myExport1: {
                operation: "export/url",
                input: "myConvert1",
                filename: "my-converted-file.jpg",
            },
        },
    });
    console.log("Created job1", jobResponse1.data.id);

    // Create a single task referring to another task
    const convertTaskResponse = await freeconvert.post("/process/convert", {
        input: taskId1,
        output_format: "jpg",
        options: {
            background: "#FFFFFF",
        },
    });
    console.log("Created task2", convertTaskResponse.data.id);

    // Create a job referring to another task
    const jobResponse2 = await freeconvert.post("/process/jobs", {
        tasks: {
            myConvert1: {
                operation: "convert",
                input: taskId1,
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
    console.log("Created job2", jobResponse2.data.id);
}

app().catch((error) => console.log(error.message));
