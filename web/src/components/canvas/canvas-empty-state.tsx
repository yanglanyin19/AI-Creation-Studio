import { Clapperboard, Images, Plus, Sparkles } from "lucide-react";

import { canvasThemes } from "@/lib/canvas-theme";
import { canvasTemplates, type CanvasTemplateId } from "@/lib/canvas/canvas-templates";
import { useThemeStore } from "@/stores/use-theme-store";

export function CanvasEmptyState({ onAddNode, onApplyTemplate }: { onAddNode: () => void; onApplyTemplate: (id: CanvasTemplateId) => void }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const recommended = canvasTemplates;

    return (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center px-6">
            <div className="pointer-events-auto flex flex-col items-center text-center">
                <p className="text-sm font-medium tracking-wide" style={{ color: theme.node.text }}>
                    今天要创作些什么，摇摇灵感？
                </p>
                <button
                    type="button"
                    onClick={onAddNode}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition hover:opacity-80"
                    style={{ borderColor: theme.node.stroke, background: theme.toolbar.panel, color: theme.node.text }}
                >
                    <Plus className="size-3.5" />
                    添加一个节点块
                </button>
            </div>

            <div className="pointer-events-auto absolute bottom-20 right-8 hidden grid-cols-2 items-end gap-3 lg:grid">
                <div className="col-span-2 mb-0 max-w-[160px] justify-self-end text-right text-[11px] leading-5" style={{ color: theme.node.muted }}>
                    使用推荐工作流
                    <br />
                    快速创建！
                    <svg viewBox="0 0 80 30" className="ml-auto mt-1 h-6 w-16" fill="none" aria-hidden="true">
                        <path d="M4 2c22 2 30 12 52 22" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                        <path d="M50 22l7 3-1-8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                {recommended.map((template) => (
                    <button key={template.id} type="button" onClick={() => onApplyTemplate(template.id)} className="group w-[168px] text-left">
                        <div className="relative flex h-[108px] flex-col justify-between overflow-hidden rounded-lg border p-3 transition group-hover:-translate-y-1" style={{ borderColor: theme.node.stroke, background: `linear-gradient(135deg, ${theme.node.fill}, ${theme.canvas.background})` }}>
                            <span className="grid size-7 place-items-center rounded-md" style={{ background: theme.toolbar.panel, color: theme.node.text }}>
                                {template.id === "dance" ? <Clapperboard className="size-3.5" /> : template.id === "multi-image-video" ? <Images className="size-3.5" /> : <Sparkles className="size-3.5" />}
                            </span>
                            <span className="text-[11px]" style={{ color: theme.node.muted }}>
                                {template.description}
                            </span>
                        </div>
                        <span className="mt-2 block text-xs font-medium" style={{ color: theme.node.text }}>
                            {template.title}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
