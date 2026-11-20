import { useState } from "react";
import { App, Button, Input, Tag } from "antd";
import { Bot, CheckCircle2, PlugZap, Unplug } from "lucide-react";

import { getGraphServerUrl, healthCheck, setGraphServerUrl } from "@/services/api/graph-server";

export function GraphServerSettings() {
    const { message } = App.useApp();
    const saved = getGraphServerUrl();
    const [url, setUrl] = useState(saved || "http://127.0.0.1:8787");
    const [testing, setTesting] = useState(false);

    const save = () => {
        setGraphServerUrl(url);
        message.success("Agent 服务地址已保存，刷新画布后生效");
    };

    const test = async () => {
        setTesting(true);
        try {
            const ok = await healthCheck(url);
            message[ok ? "success" : "error"](ok ? "Agent 服务连接正常" : "Agent 服务无响应");
        } catch {
            message.error("无法连接 Agent 服务，请先启动 agent-server");
        } finally {
            setTesting(false);
        }
    };

    return (
        <section className="mt-6 rounded-xl border border-stone-200 bg-card p-5 dark:border-stone-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="flex items-center gap-2 text-base font-semibold text-stone-950 dark:text-stone-100">
                        <Bot className="size-4" />
                        Agent 画布服务
                        {saved ? <Tag color="green" className="m-0">已启用</Tag> : <Tag className="m-0">可选</Tag>}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500 dark:text-stone-400">
                        启动本地零依赖服务后，Agent 可通过 JSON Graph 读取画布、增删节点、修改连线、触发图片/视频生成并查询任务状态。未配置时，画布仍按原方式在浏览器本地运行。
                    </p>
                    <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
                        启动：在 app/agent-server 执行 npm start；MCP：npm run mcp
                    </p>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="http://127.0.0.1:8787" className="max-w-md" />
                <Button type="primary" icon={<PlugZap className="size-4" />} onClick={save}>
                    保存
                </Button>
                <Button loading={testing} icon={<CheckCircle2 className="size-4" />} onClick={() => void test()}>
                    测试连接
                </Button>
                {saved ? (
                    <Button
                        icon={<Unplug className="size-4" />}
                        onClick={() => {
                            setGraphServerUrl("");
                            setUrl("http://127.0.0.1:8787");
                            message.success("已关闭 Agent 服务同步");
                        }}
                    >
                        关闭
                    </Button>
                ) : null}
            </div>
        </section>
    );
}
