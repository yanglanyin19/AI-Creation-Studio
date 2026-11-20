import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { App } from "antd";

import { fetchGraph, getGraphServerUrl, saveGraph } from "@/services/api/graph-server";
import type { CanvasConnection, CanvasNodeData } from "@/types/canvas";

type SyncOptions = {
    projectId: string;
    enabled: boolean;
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
    setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>;
    setConnections: Dispatch<SetStateAction<CanvasConnection[]>>;
};

/** Optional two-way sync with the local Agent Graph service. Disabled unless a URL is configured. */
export function useGraphServerSync({ projectId, enabled, nodes, connections, setNodes, setConnections }: SyncOptions) {
    const { message } = App.useApp();
    const url = getGraphServerUrl();
    const revisionRef = useRef(0);
    const snapshotRef = useRef("");
    const readyRef = useRef(false);
    const latestRef = useRef({ nodes, connections });
    const messageRef = useRef(message);
    latestRef.current = { nodes, connections };
    messageRef.current = message;

    useEffect(() => {
        revisionRef.current = 0;
        snapshotRef.current = "";
        readyRef.current = false;
        if (!url || !enabled) return;
        let cancelled = false;
        void (async () => {
            try {
                const graph = await fetchGraph(projectId);
                if (cancelled) return;
                if (!graph) {
                    const local = latestRef.current;
                    if (local.nodes.length) {
                        const saved = await saveGraph(projectId, local.nodes, local.connections);
                        revisionRef.current = saved.revision;
                        snapshotRef.current = JSON.stringify({ nodes: saved.nodes, connections: saved.connections });
                    }
                    readyRef.current = true;
                    return;
                }
                revisionRef.current = graph.revision;
                snapshotRef.current = JSON.stringify({ nodes: graph.nodes, connections: graph.connections });
                if (graph.revision > 0) {
                    setNodes(graph.nodes);
                    setConnections(graph.connections);
                }
                readyRef.current = true;
            } catch (error) {
                messageRef.current.error(error instanceof Error ? error.message : "Agent 服务连接失败");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [enabled, projectId, setConnections, setNodes, url]);

    useEffect(() => {
        if (!url || !enabled || !readyRef.current) return;
        const snapshot = JSON.stringify({ nodes, connections });
        if (snapshot === snapshotRef.current) return;
        const timer = window.setTimeout(async () => {
            try {
                const saved = await saveGraph(projectId, nodes, connections, revisionRef.current);
                revisionRef.current = saved.revision;
                snapshotRef.current = JSON.stringify({ nodes: saved.nodes, connections: saved.connections });
            } catch (error) {
                if ((error as Error & { status?: number }).status !== 409) {
                    messageRef.current.error(error instanceof Error ? error.message : "同步到 Agent 服务失败");
                    return;
                }
                try {
                    const graph = await fetchGraph(projectId);
                    if (!graph) return;
                    revisionRef.current = graph.revision;
                    snapshotRef.current = JSON.stringify({ nodes: graph.nodes, connections: graph.connections });
                    setNodes(graph.nodes);
                    setConnections(graph.connections);
                    messageRef.current.info("画布已被 Agent 更新，已重新加载");
                } catch {
                    // Keep local state; the next poll will retry.
                }
            }
        }, 700);
        return () => window.clearTimeout(timer);
    }, [connections, enabled, nodes, projectId, setConnections, setNodes, url]);

    useEffect(() => {
        if (!url || !enabled) return;
        let busy = false;
        const timer = window.setInterval(async () => {
            if (busy || !readyRef.current) return;
            busy = true;
            try {
                const graph = await fetchGraph(projectId);
                if (graph && graph.revision > revisionRef.current) {
                    revisionRef.current = graph.revision;
                    snapshotRef.current = JSON.stringify({ nodes: graph.nodes, connections: graph.connections });
                    setNodes(graph.nodes);
                    setConnections(graph.connections);
                    messageRef.current.info("画布已同步 Agent 更新");
                }
            } catch {
                // Ignore transient network failures.
            } finally {
                busy = false;
            }
        }, 4000);
        return () => window.clearInterval(timer);
    }, [enabled, projectId, setConnections, setNodes, url]);
}
