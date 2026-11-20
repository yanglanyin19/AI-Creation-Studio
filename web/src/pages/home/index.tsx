import { ArrowUp, AtSign, Clapperboard, Film, ImagePlus, Images, Maximize2, Music2, PenLine, Plus, Scissors, Sparkles, UserRound, Video, WandSparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

type ComposeMode = "image" | "video" | "canvas";

const quickActions = [
    { label: "故事短片", icon: Clapperboard, path: "/video" },
    { label: "音乐 MV", icon: Music2, path: "/video" },
    { label: "动态漫剧", icon: Film, path: "/canvas?mode=new" },
    { label: "角色设计", icon: UserRound, path: "/image" },
];

const mainTools = [
    { title: "视频生成", description: "文生视频、图生视频，多模型可选", icon: Video, path: "/video" },
    { title: "图片生成", description: "文生图、参考图编辑，一键出片", icon: ImagePlus, path: "/image" },
    { title: "图片编辑", description: "局部重绘、裁剪、扩图与超分", icon: PenLine, path: "/image" },
    { title: "无限画布", description: "把文本、图片、视频串成工作流", icon: Maximize2, path: "/canvas" },
];

const moreTools = [
    { label: "图片抠图", icon: Scissors, path: "/image" },
    { label: "图片扩图", icon: Images, path: "/image" },
    { label: "视频超分", icon: Sparkles, path: "/video" },
    { label: "视频标记消除", icon: WandSparkles, path: "/video" },
    { label: "视频字幕消除", icon: Film, path: "/video" },
    { label: "更多工具", icon: Plus, path: "/canvas" },
];

export default function HomePage() {
    const navigate = useNavigate();
    const [prompt, setPrompt] = useState("");
    const [mode, setMode] = useState<ComposeMode>("image");

    const submit = () => {
        const text = prompt.trim();
        const suffix = text ? `?prompt=${encodeURIComponent(text)}` : "";
        if (mode === "video") return navigate(`/video${suffix}`);
        if (mode === "canvas") return navigate("/canvas?mode=new");
        return navigate(`/image${suffix}`);
    };

    return (
        <main className="relative h-full overflow-y-auto bg-background bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] text-stone-950 dark:bg-[radial-gradient(rgba(245,245,244,.16)_1px,transparent_1px)] dark:text-stone-100">
            <section className="mx-auto flex min-h-full max-w-6xl flex-col px-6 pb-16 pt-[14vh]">
                <div className="mx-auto w-full max-w-[760px]">
                    <div className="mb-5 flex items-end justify-between gap-4">
                        <h1 className="text-3xl font-semibold tracking-tight">AI 创作</h1>
                        <button type="button" onClick={() => navigate("/assets")} className="hidden items-center gap-2 text-xs text-stone-500 transition hover:text-stone-900 sm:flex dark:text-stone-400 dark:hover:text-stone-100">
                            <span className="grid size-8 place-items-center rounded-full border border-stone-200 bg-card dark:border-stone-800">
                                <Sparkles className="size-3.5" />
                            </span>
                            灵感素材库
                        </button>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-card p-3 shadow-sm dark:border-stone-800">
                        <textarea
                            value={prompt}
                            onChange={(event) => setPrompt(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault();
                                    submit();
                                }
                            }}
                            rows={3}
                            placeholder="描述你想创作的故事"
                            className="w-full resize-none bg-transparent px-2 py-1.5 text-[15px] leading-6 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500"
                        />
                        <div className="mt-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1">
                                <button type="button" className="grid size-8 place-items-center rounded-full text-stone-500 transition hover:bg-black/5 dark:text-stone-400 dark:hover:bg-white/10" aria-label="添加素材">
                                    <Plus className="size-4" />
                                </button>
                                <button type="button" className="grid size-8 place-items-center rounded-full text-stone-500 transition hover:bg-black/5 dark:text-stone-400 dark:hover:bg-white/10" aria-label="引用素材">
                                    <AtSign className="size-4" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center rounded-full bg-stone-100 p-0.5 text-xs dark:bg-stone-900">
                                    {([
                                        ["image", "图片"],
                                        ["video", "视频"],
                                        ["canvas", "画布"],
                                    ] as const).map(([value, label]) => (
                                        <button key={value} type="button" onClick={() => setMode(value)} className={`rounded-full px-3 py-1.5 transition ${mode === value ? "bg-background font-medium text-stone-950 shadow-sm dark:text-stone-100" : "text-stone-500 dark:text-stone-400"}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <button type="button" onClick={submit} style={{ color: "#0c0a09" }} className="grid size-8 place-items-center rounded-full border border-stone-300 bg-stone-100 transition hover:bg-white dark:border-stone-700 dark:bg-stone-100 dark:hover:bg-white" aria-label="开始创作">
                                    <ArrowUp className="size-4" strokeWidth={2.2} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        {quickActions.map((item) => (
                            <button key={item.label} type="button" onClick={() => navigate(item.path)} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-card px-3 py-1.5 text-xs text-stone-600 transition hover:border-stone-300 hover:text-stone-950 dark:border-stone-800 dark:text-stone-300 dark:hover:border-stone-700 dark:hover:text-white">
                                <item.icon className="size-3.5" />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mx-auto mt-16 w-full max-w-6xl">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                        <div className="grid gap-3 sm:grid-cols-2">
                            {mainTools.map((item) => (
                                <button key={item.title} type="button" onClick={() => navigate(item.path)} className="group flex min-h-[132px] flex-col rounded-xl border border-stone-200 bg-card p-4 text-left transition hover:border-stone-300 hover:shadow-sm dark:border-stone-800 dark:hover:border-stone-700">
                                    <span className="grid size-9 place-items-center rounded-lg bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-200">
                                        <item.icon className="size-[18px]" />
                                    </span>
                                    <span className="mt-auto pt-6 text-sm font-medium">{item.title}</span>
                                    <span className="mt-1 text-xs leading-5 text-stone-500 dark:text-stone-400">{item.description}</span>
                                </button>
                            ))}
                        </div>
                        <div className="rounded-xl border border-stone-200 bg-card p-4 dark:border-stone-800">
                            <div className="grid h-full grid-cols-2 gap-x-2 gap-y-1">
                                {moreTools.map((item) => (
                                    <button key={item.label} type="button" onClick={() => navigate(item.path)} className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-left text-xs text-stone-600 transition hover:bg-black/[0.04] hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/[0.06] dark:hover:text-white">
                                        <item.icon className="size-4 shrink-0" />
                                        <span className="truncate">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
