import type { CanvasConnection, CanvasNodeData } from "@/types/canvas";

const GRAPH_SERVER_KEY = "infinite-canvas:graph-server";

export type GraphServerGraph = {
    id: string;
    revision: number;
    updatedAt: string;
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
};

export type GraphServerTask = {
    id: string;
    projectId: string;
    nodeId: string;
    status: "running" | "completed" | "failed";
    result?: { nodeId: string; content: string } | null;
    error?: string | null;
};

export function getGraphServerUrl() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(GRAPH_SERVER_KEY)?.trim() || "";
}

export function setGraphServerUrl(url: string) {
    const value = url.trim().replace(/\/+$/, "");
    if (value) localStorage.setItem(GRAPH_SERVER_KEY, value);
    else localStorage.removeItem(GRAPH_SERVER_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const baseUrl = getGraphServerUrl();
    if (!baseUrl) throw new Error("未配置 Agent 服务地址");
    const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const text = await response.text();
    let payload: unknown = null;
    try {
        payload = text ? JSON.parse(text) : null;
    } catch {
        throw new Error(`Agent 服务返回非 JSON：${text.slice(0, 160)}`);
    }
    if (!response.ok) {
        const error = new Error((payload as { error?: string } | null)?.error || `Agent 服务请求失败：${response.status}`);
        (error as Error & { status?: number }).status = response.status;
        throw error;
    }
    return payload as T;
}

export async function fetchGraph(projectId: string) {
    try {
        return await request<GraphServerGraph>(`/api/canvas/${encodeURIComponent(projectId)}`);
    } catch (error) {
        if ((error as Error & { status?: number }).status === 404) return null;
        throw error;
    }
}

export function saveGraph(projectId: string, nodes: CanvasNodeData[], connections: CanvasConnection[], baseRevision?: number) {
    return request<GraphServerGraph>(`/api/canvas/${encodeURIComponent(projectId)}`, {
        method: "PUT",
        body: JSON.stringify({ nodes, connections, ...(baseRevision === undefined ? {} : { baseRevision }) }),
    });
}

export function patchGraph(projectId: string, operations: unknown[], baseRevision?: number) {
    return request<GraphServerGraph>(`/api/canvas/${encodeURIComponent(projectId)}/patch`, {
        method: "POST",
        body: JSON.stringify({ operations, ...(baseRevision === undefined ? {} : { baseRevision }) }),
    });
}

export function runNode(projectId: string, nodeId: string, provider: { baseUrl: string; apiKey: string; model: string }) {
    return request<GraphServerTask>(`/api/canvas/${encodeURIComponent(projectId)}/run`, {
        method: "POST",
        body: JSON.stringify({ nodeId, provider }),
    });
}

export function getTask(taskId: string) {
    return request<GraphServerTask>(`/api/tasks/${encodeURIComponent(taskId)}`);
}

export function healthCheck(url: string) {
    return fetch(`${url.trim().replace(/\/+$/, "")}/health`).then((response) => response.ok);
}
