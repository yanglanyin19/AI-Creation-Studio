import { Bot, FileText, Home, ImagePlus, Images, Maximize2, Moon, Settings2, Sun, Video } from "lucide-react";
import { Tooltip } from "antd";
import { Link, useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";
import { useAgentStore } from "@/stores/use-agent-store";
import { useConfigStore } from "@/stores/use-config-store";
import { useThemeStore } from "@/stores/use-theme-store";

const items = [
    { to: "/", label: "首页", icon: Home, exact: true },
    { to: "/canvas", label: "画布", icon: Maximize2 },
    { to: "/image", label: "AI 生图", icon: ImagePlus },
    { to: "/video", label: "视频生成", icon: Video },
    { to: "/assets", label: "资产", icon: Images },
    { to: "/prompts", label: "提示词", icon: FileText },
];

export function AppSideNav() {
    const { pathname } = useLocation();
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const toggleAgent = useAgentStore((state) => state.togglePanel);
    const agentOpen = useAgentStore((state) => state.panelOpen);

    return (
        <aside className="hidden h-full w-[64px] shrink-0 flex-col items-center border-r border-stone-200 bg-background py-3 md:flex dark:border-stone-800">
            <Link to="/" className="mb-5 grid size-9 place-items-center rounded-lg text-foreground transition hover:bg-black/5 dark:hover:bg-white/10" aria-label="首页">
                <span className="size-5 bg-current" style={{ mask: `url(${import.meta.env.BASE_URL}logo.svg) center / contain no-repeat`, WebkitMask: `url(${import.meta.env.BASE_URL}logo.svg) center / contain no-repeat` }} />
            </Link>

            <nav className="flex w-full flex-1 flex-col items-center gap-1">
                {items.map((item) => {
                    const Icon = item.icon;
                    const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
                    return (
                        <Tooltip key={item.to} title={item.label} placement="right" mouseEnterDelay={0.25}>
                            <Link
                                to={item.to}
                                aria-label={item.label}
                                className={cn(
                                    "flex w-[54px] flex-col items-center gap-1 rounded-lg py-2 text-[10px] leading-none transition",
                                    active ? "bg-black/[0.06] font-medium text-stone-950 dark:bg-white/10 dark:text-white" : "text-stone-500 hover:bg-black/[0.04] hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/[0.06] dark:hover:text-stone-100",
                                )}
                            >
                                <Icon className="size-[18px]" />
                                <span className="truncate">{item.label}</span>
                            </Link>
                        </Tooltip>
                    );
                })}
            </nav>

            <div className="flex flex-col items-center gap-1">
                <Tooltip title="创作助手" placement="right" mouseEnterDelay={0.25}>
                    <button type="button" onClick={toggleAgent} className={cn("grid size-9 place-items-center rounded-lg transition", agentOpen ? "bg-black/[0.06] text-stone-950 dark:bg-white/10 dark:text-white" : "text-stone-500 hover:bg-black/5 dark:text-stone-400 dark:hover:bg-white/10")} aria-label="创作助手">
                        <Bot className="size-[18px]" />
                    </button>
                </Tooltip>
                <Tooltip title="模型配置" placement="right" mouseEnterDelay={0.25}>
                    <button type="button" onClick={() => openConfigDialog(false)} className="grid size-9 place-items-center rounded-lg text-stone-500 transition hover:bg-black/5 dark:text-stone-400 dark:hover:bg-white/10" aria-label="模型配置">
                        <Settings2 className="size-[18px]" />
                    </button>
                </Tooltip>
                <Tooltip title={theme === "dark" ? "浅色模式" : "深色模式"} placement="right" mouseEnterDelay={0.25}>
                    <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="grid size-9 place-items-center rounded-lg text-stone-500 transition hover:bg-black/5 dark:text-stone-400 dark:hover:bg-white/10" aria-label="切换主题">
                        {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
                    </button>
                </Tooltip>
            </div>
        </aside>
    );
}
