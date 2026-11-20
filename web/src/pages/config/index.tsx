import { App, Button } from "antd";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AppConfigPanel } from "@/components/layout/app-config-modal";
import { GraphServerSettings } from "@/components/layout/graph-server-settings";
import { getPluginTemplates } from "@/services/api/model-plugin";
import { createModelChannel, useConfigStore } from "@/stores/use-config-store";

export default function ConfigPage() {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const config = useConfigStore((state) => state.config);
    const updateConfig = useConfigStore((state) => state.updateConfig);

    const addWanChannel = () => {
        const modelNames = ["wan3.0-video", "wan3.0-video-prime"];
        const script = getPluginTemplates().video.find((template) => template.label === t("modelPlugin.templates.wan"))?.script || "";
        if (!script) {
            message.error("未找到万相 3.0 调用脚本模板");
            return;
        }
        const existing = config.channels.find((channel) => channel.name === "千问万相 3.0" || channel.models.some((model) => modelNames.includes(model.name)));
        if (existing) {
            const models = modelNames.map((name) => {
                const current = existing.models.find((model) => model.name === name);
                return { name, capability: "video" as const, script: current?.script || script };
            });
            const values = modelNames.map((name) => `${existing.id}::${name}`);
            updateConfig("channels", config.channels.map((channel) => (channel.id === existing.id ? { ...channel, models } : channel)));
            updateConfig("videoModel", values[1]);
            updateConfig("models", Array.from(new Set([...config.models, ...values])));
            message.success("已补充 wan3.0-video-prime，并默认选中 prime");
            return;
        }
        const channel = createModelChannel({
            name: "千问万相 3.0",
            baseUrl: "https://maas.qianwenaiapi.com/api/v1",
            apiFormat: "custom",
            models: modelNames.map((name) => ({ name, capability: "video", script })),
        });
        const values = modelNames.map((name) => `${channel.id}::${name}`);
        updateConfig("channels", [...config.channels, channel]);
        updateConfig("videoModel", values[1]);
        updateConfig("models", Array.from(new Set([...config.models, ...values])));
        message.success("已添加千问万相 3.0 渠道（wan3.0-video / wan3.0-video-prime），请填写 API Key");
    };

    return (
        <main className="h-full overflow-y-auto bg-background">
            <div className="mx-auto max-w-6xl px-6 py-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-stone-950 dark:text-stone-100">{t("config.title")}</h1>
                        <p className="mt-1 text-sm text-stone-500">{t("config.description")}</p>
                    </div>
                    <Button icon={<Sparkles className="size-4" />} onClick={addWanChannel}>
                        添加万相 3.0 渠道
                    </Button>
                </div>
                <AppConfigPanel />
                <GraphServerSettings />
            </div>
        </main>
    );
}
