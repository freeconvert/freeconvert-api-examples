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

async function websocketExample1() {
    console.log("websocket example 1");

    //
    // Initialize a websocket connection to FreeConvert notification service, using socket.io client library.
    // Read more: https://www.freeconvert.com/api/v1/#freeconvert-com-api-socket
    //
    const socket = io("https://notification.freeconvert.com/", {
        transports: ["websocket"],
        path: "/socket.io",
        auth: { token: `Bearer ${apiKey}` },
    });

    // Create a single task.
    const taskResponse1 = await freeconvert.post("/process/import/url", {
        url: "https://cdn.freeconvert.com/logo_theme.svg",
        filename: "logo.svg",
    });
    const taskId = taskResponse1.data.id;

    // Watch for task completion event. Following code will handle successful completion only.
    // For more events, see https://www.freeconvert.com/api/v1/?javascript#websocket-channels-amp-events
    //
    // *** Note: Events may arrive out of oder. ***
    //
    socket.on("task_completed", (data) => {
        console.log("Task completed", data.id);
        // Unsubscribe when no longer needed.
        socket.emit("unsubscribe", `task.${data.id}`);
        socket.disconnect();
    });

    // Subscribe to events of the created task.
    console.log("Start waiting for task", taskId);
    socket.emit("subscribe", `task.${taskId}`);
}

async function websocketExample2() {
    console.log("websocket example 2");

    //
    // Initialize a websocket connection to FreeConvert notification service, using socket.io client library.
    // Read more: https://www.freeconvert.com/api/v1/#freeconvert-com-api-socket
    //
    const socket = io("https://notification.freeconvert.com/", {
        transports: ["websocket"],
        path: "/socket.io",
        auth: { token: `Bearer ${apiKey}` },
    });

    // Create a job. Job will complete when all its children tasks are complete.
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
            },
            myExport1: {
                operation: "export/url",
                input: "myConvert1",
                filename: "my-converted-file.jpg",
            },
        },
    });
    const jobId = jobResponse1.data.id;

    // Register for task and job completion events. Following code will handle successful completion only.
    // For more events, see https://www.freeconvert.com/api/v1/?javascript#websocket-channels-amp-events
    //
    // *** Note: Events may arrive out of oder. ***
    //

    socket.on("task_completed", (data) => {
        console.log("Task completed", data.name);
        // Unsubscribe when no longer needed.
        socket.emit("unsubscribe", `task.${data.id}`);
    });

    socket.on("job_completed", (data) => {
        console.log("Job completed", data.id);
        // Unsubscribe when no longer needed.
        socket.emit("unsubscribe", `job.${data.id}`);
        socket.disconnect();
    });

    // Subscribe to events of the created job.
    console.log("Start waiting for job", jobId);
    socket.emit("subscribe", `job.${jobId}`);

    // Subscribe to all tasks in the job.
    jobResponse1.data.tasks.forEach((task) => {
        socket.emit("subscribe", `task.${task.id}`);
    });
}

async function app() {
    await websocketExample1();
    await websocketExample2();
}

app().catch((error) => console.log(error.message));
