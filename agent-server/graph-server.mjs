import { createServer } from "node:http";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.GRAPH_DATA_DIR || path.join(ROOT, "data");
const PORT = Number(process.env.GRAPH_SERVER_PORT || 8787);
const HOST = process.env.GRAPH_SERVER_HOST || "127.0.0.1";
const tasks = new Map();

const NODE_DEFAULTS = {
    text: { width: 340, height: 240, title: "文本" },
    image: { width: 340, height: 240, title: "图片" },
    video: { width: 420, height: 236, title: "视频" },
    config: { width: 340, height: 240, title: "配置" },
    audio: { width: 340, height: 120, title: "音频" },
    group: { width: 760, height: 480, title: "分组" },
};

function normalizeNode(node) {
    const defaults = NODE_DEFAULTS[node.type] || { width: 340, height: 240, title: node.type };
    return { ...defaults, ...node, metadata: { ...(node.metadata || {}) } };
}

const NODE_TYPES = [
    { type: "text", title: "文本", inputs: [], fields: [{ name: "content", type: "string" }] },
    { type: "image", title: "图片", inputs: ["text", "image"], fields: [{ name: "prompt", type: "string" }, { name: "size", type: "string" }, { name: "count", type: "number" }] },
    { type: "video", title: "视频", inputs: ["text", "image"], fields: [{ name: "prompt", type: "string" }, { name: "seconds", type: "string" }, { name: "size", type: "string" }] },
    { type: "config", title: "配置", inputs: [], fields: [{ name: "model", type: "string" }, { name: "size", type: "string" }] },
    { type: "audio", title: "音频", inputs: ["text"], fields: [] },
    { type: "group", title: "分组", inputs: [], fields: [] },
];

function graphPath(id) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw new Error("invalid project id");
    return path.join(DATA_DIR, `${id}.json`);
}

async function readGraph(id) {
    try {
        return JSON.parse(await readFile(graphPath(id), "utf8"));
    } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
    }
}

async function writeGraph(graph) {
    await mkdir(DATA_DIR, { recursive: true });
    const file = graphPath(graph.id);
    const temp = `${file}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(graph, null, 2), "utf8");
    await rename(temp, file);
    return graph;
}

function emptyGraph(id) {
    return { id, revision: 0, updatedAt: new Date().toISOString(), nodes: [], connections: [] };
}

function assertGraphShape(body) {
    if (!body || typeof body !== "object") throw new Error("graph must be an object");
    if (!Array.isArray(body.nodes) || !Array.isArray(body.connections)) throw new Error("nodes and connections must be arrays");
    for (const node of body.nodes) {
        if (!node || typeof node.id !== "string" || typeof node.type !== "string") throw new Error("node requires id and type");
        if (!node.position || typeof node.position.x !== "number" || typeof node.position.y !== "number") throw new Error(`node ${node.id} requires position`);
    }
    for (const edge of body.connections) {
        if (!edge || typeof edge.id !== "string" || typeof edge.fromNodeId !== "string" || typeof edge.toNodeId !== "string") throw new Error("edge requires id, fromNodeId, toNodeId");
        if (edge.fromNodeId === edge.toNodeId) throw new Error("edge cannot connect a node to itself");
    }
}

function applyOperations(graph, operations) {
    if (!Array.isArray(operations)) throw new Error("operations must be an array");
    const nodes = graph.nodes.map((node) => ({ ...node, metadata: { ...(node.metadata || {}) } }));
    const connections = graph.connections.map((edge) => ({ ...edge }));
    const findNode = (id) => nodes.find((node) => node.id === id);

    for (const operation of operations) {
        const op = operation?.op;
        if (op === "add_node") {
            assertGraphShape({ nodes: [operation.node], connections: [] });
            if (findNode(operation.node.id)) throw new Error(`node already exists: ${operation.node.id}`);
            nodes.push(normalizeNode(operation.node));
            continue;
        }
        if (op === "update_node") {
            const node = findNode(operation.id);
            if (!node) throw new Error(`node not found: ${operation.id}`);
            if (operation.patch && typeof operation.patch === "object") {
                for (const [key, value] of Object.entries(operation.patch)) {
                    if (key === "metadata" && value && typeof value === "object") node.metadata = { ...node.metadata, ...value };
                    else if (key !== "id" && key !== "type") node[key] = value;
                }
            }
            continue;
        }
        if (op === "remove_node") {
            const index = nodes.findIndex((node) => node.id === operation.id);
            if (index < 0) throw new Error(`node not found: ${operation.id}`);
            nodes.splice(index, 1);
            for (let i = connections.length - 1; i >= 0; i -= 1) {
                if (connections[i].fromNodeId === operation.id || connections[i].toNodeId === operation.id) connections.splice(i, 1);
            }
            continue;
        }
        if (op === "add_edge") {
            assertGraphShape({ nodes: [], connections: [operation.edge] });
            if (!findNode(operation.edge.fromNodeId) || !findNode(operation.edge.toNodeId)) throw new Error("edge references a missing node");
            if (connections.some((edge) => edge.fromNodeId === operation.edge.fromNodeId && edge.toNodeId === operation.edge.toNodeId)) throw new Error("edge already exists");
            connections.push({ ...operation.edge });
            continue;
        }
        if (op === "remove_edge") {
            const index = connections.findIndex((edge) => edge.id === operation.id);
            if (index < 0) throw new Error(`edge not found: ${operation.id}`);
            connections.splice(index, 1);
            continue;
        }
        if (op === "set_params") {
            const node = findNode(operation.id);
            if (!node) throw new Error(`node not found: ${operation.id}`);
            node.metadata = { ...node.metadata, ...(operation.params || {}) };
            continue;
        }
        throw new Error(`unsupported operation: ${op}`);
    }

    return { ...graph, nodes, connections };
}

function upstreamNodes(graph, nodeId) {
    const ids = graph.connections.filter((edge) => edge.toNodeId === nodeId).map((edge) => edge.fromNodeId);
    return graph.nodes.filter((node) => ids.includes(node.id));
}

function resolvePrompt(graph, node) {
    const own = node.metadata?.prompt || node.metadata?.composerContent || node.metadata?.content;
    if (own && node.type !== "image" && node.type !== "video") return String(own);
    const upstreamText = upstreamNodes(graph, node.id)
        .filter((item) => item.type === "text")
        .map((item) => item.metadata?.content || item.metadata?.prompt || "")
        .filter(Boolean)
        .join("\n");
    return String(own || upstreamText || "").trim();
}

function referenceImages(graph, nodeId) {
    return upstreamNodes(graph, nodeId)
        .filter((node) => node.type === "image" && node.metadata?.content)
        .map((node) => String(node.metadata.content));
}

function updateNode(graph, nodeId, patch) {
    return {
        ...graph,
        revision: graph.revision + 1,
        updatedAt: new Date().toISOString(),
        nodes: graph.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch, metadata: { ...node.metadata, ...(patch.metadata || {}) } } : node)),
    };
}

function taskView(task) {
    return { id: task.id, projectId: task.projectId, nodeId: task.nodeId, status: task.status, result: task.result || null, error: task.error || null, createdAt: task.createdAt, updatedAt: task.updatedAt };
}

function setTask(task, status, patch = {}) {
    task.status = status;
    task.updatedAt = new Date().toISOString();
    Object.assign(task, patch);
}

const IMAGE_SIZES = {
    "1:1": "1024x1024",
    "4:3": "1024x768",
    "3:4": "768x1024",
    "16:9": "1280x720",
    "9:16": "720x1280",
    "3:2": "1152x768",
    "2:3": "768x1152",
    "21:9": "1680x720",
    "9:21": "720x1680",
};

function resolveImageSize(value) {
    const input = String(value || "").trim();
    if (/^\d+x\d+$/.test(input)) return input;
    return IMAGE_SIZES[input] || "1024x1024";
}

function resolveVideoSize(value) {
    const input = String(value || "").trim();
    if (/^\d+x\d+$/.test(input)) return input;
    return input === "9:16" || input === "3:4" ? "720x1280" : "1280x720";
}

async function callImageApi(provider, prompt, node) {
    const baseUrl = String(provider.baseUrl || "").replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(baseUrl)) throw new Error("provider.baseUrl must start with http:// or https://");
    if (!provider.apiKey) throw new Error("provider.apiKey is required");
    if (!provider.model) throw new Error("provider.model is required");
    const size = resolveImageSize(node.metadata?.size);
    const body = { model: provider.model, prompt, n: 1, size };
    if (!/gpt-image/.test(provider.model)) body.response_format = "b64_json";
    const response = await fetch(`${baseUrl}/images/generations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const text = await response.text();
    let payload;
    try {
        payload = JSON.parse(text);
    } catch {
        throw new Error(`image api returned non-JSON: ${text.slice(0, 200)}`);
    }
    if (!response.ok) throw new Error(payload?.error?.message || payload?.msg || `image api failed: ${response.status}`);
    const item = payload?.data?.[0] || payload?.images?.[0];
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    if (item?.url) return new URL(item.url, `${baseUrl}/`).toString();
    throw new Error("image api returned no image");
}

async function callVideoApi(provider, prompt, node) {
    const baseUrl = String(provider.baseUrl || "").replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(baseUrl)) throw new Error("provider.baseUrl must start with http:// or https://");
    if (!provider.apiKey) throw new Error("provider.apiKey is required");
    if (!provider.model) throw new Error("provider.model is required");
    const created = await fetch(`${baseUrl}/videos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: provider.model, prompt, seconds: node.metadata?.seconds || "5", size: resolveVideoSize(node.metadata?.size) }),
    });
    const createdText = await created.text();
    let createdPayload;
    try {
        createdPayload = JSON.parse(createdText);
    } catch {
        throw new Error(`video api returned non-JSON: ${createdText.slice(0, 200)}`);
    }
    if (!created.ok) throw new Error(createdPayload?.error?.message || createdPayload?.msg || `video api failed: ${created.status}`);
    const id = createdPayload?.id || createdPayload?.data?.id;
    if (!id) throw new Error("video api returned no task id");
    for (let attempt = 0; attempt < 120; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const polled = await fetch(`${baseUrl}/videos/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${provider.apiKey}` } });
        const polledText = await polled.text();
        let payload;
        try {
            payload = JSON.parse(polledText);
        } catch {
            continue;
        }
        const video = payload?.data || payload;
        const url = video?.video_url || video?.result_url || video?.url || video?.content?.video_url || video?.content?.url;
        if (url) return new URL(url, `${baseUrl}/`).toString();
        if (video?.status === "failed" || video?.status === "cancelled") throw new Error(video?.error?.message || "video generation failed");
    }
    throw new Error("video generation timed out");
}

function resolveProvider(provider = {}, nodeType) {
    return {
        baseUrl: String(provider.baseUrl || process.env.OPENAI_BASE_URL || "").trim(),
        apiKey: String(provider.apiKey || process.env.OPENAI_API_KEY || "").trim(),
        model: String(provider.model || (nodeType === "video" ? process.env.OPENAI_VIDEO_MODEL : process.env.OPENAI_IMAGE_MODEL) || process.env.OPENAI_MODEL || "").trim(),
    };
}

async function executeNode(projectId, nodeId, provider) {
    const graph = await readGraph(projectId);
    if (!graph) throw new Error("canvas not found");
    const node = graph.nodes.find((item) => item.id === nodeId);
    if (!node) throw new Error("node not found");
    if (node.type === "text") return { skipped: true, reason: "text nodes have no generation task" };
    if (node.type !== "image" && node.type !== "video") throw new Error(`node type ${node.type} is not executable`);
    const resolvedProvider = resolveProvider(provider, node.type);
    const prompt = resolvePrompt(graph, node);
    if (!prompt) throw new Error("prompt is empty");
    await writeGraph(updateNode(graph, nodeId, { metadata: { status: "loading", errorDetails: undefined } }));
    const task = { id: randomUUID(), projectId, nodeId, status: "running", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    tasks.set(task.id, task);
    void (async () => {
        try {
            const content = node.type === "image" ? await callImageApi(resolvedProvider, prompt, node) : await callVideoApi(resolvedProvider, prompt, node);
            const latest = (await readGraph(projectId)) || graph;
            const withResult = updateNode(latest, nodeId, { metadata: { content, status: "success", prompt, model: resolvedProvider.model } });
            await writeGraph(withResult);
            setTask(task, "completed", { result: { nodeId, content } });
        } catch (error) {
            const latest = (await readGraph(projectId)) || graph;
            await writeGraph(updateNode(latest, nodeId, { metadata: { status: "error", errorDetails: error.message } }));
            setTask(task, "failed", { error: error.message });
        }
    })();
    return taskView(task);
}

async function waitForTask(taskId) {
    for (let attempt = 0; attempt < 600; attempt += 1) {
        const task = tasks.get(taskId);
        if (!task) throw new Error("task not found");
        if (task.status === "completed") return task;
        if (task.status === "failed") throw new Error(task.error || "task failed");
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error("task timed out");
}

async function runGraph(projectId, provider) {
    const graph = await readGraph(projectId);
    if (!graph) throw new Error("canvas not found");
    const indegree = new Map(graph.nodes.map((node) => [node.id, 0]));
    for (const edge of graph.connections) indegree.set(edge.toNodeId, (indegree.get(edge.toNodeId) || 0) + 1);
    const queue = graph.nodes.filter((node) => (indegree.get(node.id) || 0) === 0).map((node) => node.id);
    const order = [];
    while (queue.length) {
        const id = queue.shift();
        order.push(id);
        for (const edge of graph.connections.filter((item) => item.fromNodeId === id)) {
            const next = indegree.get(edge.toNodeId) - 1;
            indegree.set(edge.toNodeId, next);
            if (next === 0) queue.push(edge.toNodeId);
        }
    }
    const created = [];
    for (const nodeId of order) {
        const node = graph.nodes.find((item) => item.id === nodeId);
        if (!node || (node.type !== "image" && node.type !== "video")) continue;
        const task = await executeNode(projectId, nodeId, provider);
        created.push(task);
        if (task.id) await waitForTask(task.id);
    }
    return { revision: graph.revision, tasks: created };
}

async function patchProject(projectId, body) {
    const graph = (await readGraph(projectId)) || emptyGraph(projectId);
    if (body.baseRevision !== undefined && Number(body.baseRevision) !== graph.revision) {
        const error = new Error(`revision conflict: current revision is ${graph.revision}`);
        error.status = 409;
        throw error;
    }
    const next = applyOperations(graph, body.operations);
    next.revision = graph.revision + 1;
    next.updatedAt = new Date().toISOString();
    return writeGraph(next);
}

async function saveProject(projectId, body) {
    const graph = (await readGraph(projectId)) || emptyGraph(projectId);
    if (body.baseRevision !== undefined && Number(body.baseRevision) !== graph.revision) {
        const error = new Error(`revision conflict: current revision is ${graph.revision}`);
        error.status = 409;
        throw error;
    }
    assertGraphShape(body);
    const next = { ...graph, nodes: body.nodes, connections: body.connections, revision: graph.revision + 1, updatedAt: new Date().toISOString() };
    return writeGraph(next);
}

async function listCanvases() {
    const files = await readdir(DATA_DIR).catch(() => []);
    const canvases = [];
    for (const file of files.filter((item) => item.endsWith(".json"))) {
        const graph = await readGraph(file.slice(0, -5)).catch(() => null);
        if (graph) canvases.push({ id: graph.id, revision: graph.revision, updatedAt: graph.updatedAt, nodeCount: graph.nodes.length });
    }
    return canvases;
}

async function readBody(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > 20 * 1024 * 1024) throw new Error("request body too large");
        chunks.push(chunk);
    }
    if (!chunks.length) return {};
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response, status, payload) {
    const body = JSON.stringify(payload);
    response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    });
    response.end(body);
}

function createHttpServer() {
    return createServer(async (request, response) => {
        if (request.method === "OPTIONS") {
            response.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" });
            response.end();
            return;
        }
        try {
            const url = new URL(request.url, `http://${request.headers.host}`);
            const parts = url.pathname.split("/").filter(Boolean);
            if (request.method === "GET" && url.pathname === "/health") return send(response, 200, { ok: true });
            if (request.method === "GET" && url.pathname === "/api/node-types") return send(response, 200, { nodeTypes: NODE_TYPES });
            if (request.method === "GET" && url.pathname === "/api/canvas") return send(response, 200, { canvases: await listCanvases() });
            if (parts[0] === "api" && parts[1] === "tasks" && parts[2] && request.method === "GET") {
                const task = tasks.get(parts[2]);
                if (!task) return send(response, 404, { error: "task not found" });
                return send(response, 200, taskView(task));
            }
            if (parts[0] === "api" && parts[1] === "canvas" && parts[2]) {
                const projectId = parts[2];
                if (request.method === "GET") {
                    const graph = await readGraph(projectId);
                    if (!graph) return send(response, 404, { error: "canvas not found" });
                    return send(response, 200, graph);
                }
                if (request.method === "PUT") return send(response, 200, await saveProject(projectId, await readBody(request)));
                if (request.method === "POST" && parts[3] === "patch") return send(response, 200, await patchProject(projectId, await readBody(request)));
                if (request.method === "POST" && parts[3] === "run") {
                    const body = await readBody(request);
                    if (body.nodeId) return send(response, 202, await executeNode(projectId, body.nodeId, body.provider || {}));
                    return send(response, 202, await runGraph(projectId, body.provider || {}));
                }
            }
            send(response, 404, { error: "not found" });
        } catch (error) {
            send(response, error.status || 400, { error: error.message });
        }
    });
}

const TOOLS = [
    { name: "list_canvases", description: "List saved canvas project ids, revisions and node counts.", inputSchema: { type: "object", properties: {} } },
    { name: "read_canvas", description: "Read the canvas JSON graph (nodes and connections).", inputSchema: { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"] } },
    {
        name: "apply_patch",
        description: "Atomically add/update/remove nodes and edges. Operations: add_node, update_node, remove_node, add_edge, remove_edge, set_params.",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string" },
                baseRevision: { type: "number" },
                operations: { type: "array", items: { type: "object", properties: { op: { type: "string" } }, required: ["op"] } },
            },
            required: ["projectId", "operations"],
        },
    },
    {
        name: "run_node",
        description: "Run one image or video node through an OpenAI-compatible provider. Provider can be omitted when OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_IMAGE_MODEL / OPENAI_VIDEO_MODEL are set on the server.",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string" },
                nodeId: { type: "string" },
                provider: { type: "object", properties: { baseUrl: { type: "string" }, apiKey: { type: "string" }, model: { type: "string" } } },
            },
            required: ["projectId", "nodeId"],
        },
    },
    {
        name: "run_graph",
        description: "Run all image/video nodes in topological order through an OpenAI-compatible provider. Provider can be omitted when server environment variables are set.",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string" },
                provider: { type: "object", properties: { baseUrl: { type: "string" }, apiKey: { type: "string" }, model: { type: "string" } } },
            },
            required: ["projectId"],
        },
    },
    { name: "get_task_status", description: "Get the status of an async run task.", inputSchema: { type: "object", properties: { taskId: { type: "string" } }, required: ["taskId"] } },
    { name: "describe_node_types", description: "List available node types and their parameter fields.", inputSchema: { type: "object", properties: {} } },
];

async function callTool(name, args) {
    if (name === "list_canvases") return { canvases: await listCanvases() };
    if (name === "read_canvas") {
        const graph = await readGraph(args.projectId);
        if (!graph) throw new Error("canvas not found");
        return graph;
    }
    if (name === "apply_patch") return patchProject(args.projectId, args);
    if (name === "run_node") return executeNode(args.projectId, args.nodeId, args.provider || {});
    if (name === "run_graph") return runGraph(args.projectId, args.provider || {});
    if (name === "get_task_status") {
        const task = tasks.get(args.taskId);
        if (!task) throw new Error("task not found");
        return taskView(task);
    }
    if (name === "describe_node_types") return { nodeTypes: NODE_TYPES };
    throw new Error(`unknown tool: ${name}`);
}

function startMcpServer() {
    const lines = createInterface({ input: process.stdin, terminal: false });
    lines.on("line", async (line) => {
        if (!line.trim()) return;
        let message;
        try {
            message = JSON.parse(line);
        } catch {
            return;
        }
        if (message.id === undefined) return;
        const respond = (result) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: message.id, result })}\n`);
        const fail = (error) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: message.id, error: { code: -32603, message: error.message } })}\n`);
        try {
            if (message.method === "initialize") {
                respond({ protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "canvas-graph", version: "0.1.0" } });
                return;
            }
            if (message.method === "tools/list") {
                respond({ tools: TOOLS });
                return;
            }
            if (message.method === "tools/call") {
                const result = await callTool(message.params?.name, message.params?.arguments || {});
                respond({ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
                return;
            }
            if (message.method === "ping") {
                respond({});
                return;
            }
            fail(new Error(`unknown method: ${message.method}`));
        } catch (error) {
            fail(error);
        }
    });
}

if (process.argv.includes("--mcp")) {
    startMcpServer();
} else {
    createHttpServer().listen(PORT, HOST, () => {
        console.error(`[canvas-graph] http://${HOST}:${PORT}`);
        console.error(`[canvas-graph] data: ${DATA_DIR}`);
    });
}
