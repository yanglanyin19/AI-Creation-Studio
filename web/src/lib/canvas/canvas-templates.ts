import { nanoid } from "nanoid";

import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type Position } from "@/types/canvas";
import { createCanvasNode } from "./canvas-node-factory";

export type CanvasTemplateId = "dance" | "multi-image-video" | "text-to-image" | "image-edit";

export type CanvasTemplate = {
    id: CanvasTemplateId;
    title: string;
    description: string;
};

export const canvasTemplates: CanvasTemplate[] = [
    { id: "dance", title: "全民嗨跳", description: "人物图 + 跳舞指令，直接生成短视频" },
    { id: "multi-image-video", title: "多图生视频", description: "两张参考图 + 镜头描述，生成连贯视频" },
    { id: "text-to-image", title: "文生图", description: "一句提示词，快速生成图片" },
    { id: "image-edit", title: "图片编辑", description: "上传参考图，按指令改图" },
];

type TemplateGraph = { nodes: CanvasNodeData[]; connections: CanvasConnection[] };

const PROMPTS = {
    dance: "一位年轻舞者在霓虹街头跳舞，镜头跟随，动感十足，电影感光线",
    danceImage: "根据左侧文案生成一张人物全身图，霓虹街头，电影感光线",
    danceVideo: "让画面中的人物跳一段节奏感强的舞，镜头缓慢推进",
    multi: "根据两张参考图生成一段连贯的视频，保持人物与场景一致",
    multiLeft: "参考图 A：人物正面全身，干净背景",
    multiRight: "参考图 B：同一人物的侧面或场景细节",
    image: "一只在霓虹城市里奔跑的机械猫，电影感，高细节",
    edit: "把参考图改成赛博朋克夜景风格，保留人物姿态",
};

function at(center: Position, dx: number, dy = 0): Position {
    return { x: center.x + dx, y: center.y + dy };
}

export function buildCanvasTemplate(id: CanvasTemplateId, center: Position): TemplateGraph {
    if (id === "dance") {
        const text = createCanvasNode(CanvasNodeType.Text, at(center, -430), { content: PROMPTS.dance, prompt: PROMPTS.dance, status: "success", fontSize: 14 });
        const image = createCanvasNode(CanvasNodeType.Image, at(center, 0), { prompt: PROMPTS.danceImage, status: "idle", generationType: "generation" });
        const video = createCanvasNode(CanvasNodeType.Video, at(center, 460), { prompt: PROMPTS.danceVideo, status: "idle", videoMode: "frames" });
        return {
            nodes: [text, image, video],
            connections: [
                { id: nanoid(), fromNodeId: text.id, toNodeId: image.id },
                { id: nanoid(), fromNodeId: image.id, toNodeId: video.id },
            ],
        };
    }

    if (id === "multi-image-video") {
        const text = createCanvasNode(CanvasNodeType.Text, at(center, -560), { content: PROMPTS.multi, prompt: PROMPTS.multi, status: "success", fontSize: 14 });
        const left = createCanvasNode(CanvasNodeType.Image, at(center, -190, -130), { prompt: PROMPTS.multiLeft, status: "idle", generationType: "generation" });
        const right = createCanvasNode(CanvasNodeType.Image, at(center, -190, 150), { prompt: PROMPTS.multiRight, status: "idle", generationType: "generation" });
        const video = createCanvasNode(CanvasNodeType.Video, at(center, 430), { prompt: PROMPTS.multi, status: "idle", videoMode: "reference" });
        return {
            nodes: [text, left, right, video],
            connections: [
                { id: nanoid(), fromNodeId: text.id, toNodeId: video.id },
                { id: nanoid(), fromNodeId: left.id, toNodeId: video.id },
                { id: nanoid(), fromNodeId: right.id, toNodeId: video.id },
            ],
        };
    }

    if (id === "image-edit") {
        const source = createCanvasNode(CanvasNodeType.Image, at(center, -400), { status: "idle" });
        const text = createCanvasNode(CanvasNodeType.Text, at(center, 0, 170), { content: PROMPTS.edit, prompt: PROMPTS.edit, status: "success", fontSize: 14 });
        const output = createCanvasNode(CanvasNodeType.Image, at(center, 400), { prompt: PROMPTS.edit, status: "idle", generationType: "edit" });
        return {
            nodes: [source, text, output],
            connections: [
                { id: nanoid(), fromNodeId: source.id, toNodeId: output.id },
                { id: nanoid(), fromNodeId: text.id, toNodeId: output.id },
            ],
        };
    }

    const text = createCanvasNode(CanvasNodeType.Text, at(center, -330), { content: PROMPTS.image, prompt: PROMPTS.image, status: "success", fontSize: 14 });
    const image = createCanvasNode(CanvasNodeType.Image, at(center, 330), { prompt: PROMPTS.image, status: "idle", generationType: "generation" });
    return { nodes: [text, image], connections: [{ id: nanoid(), fromNodeId: text.id, toNodeId: image.id }] };
}
