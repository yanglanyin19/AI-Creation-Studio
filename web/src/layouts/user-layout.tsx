import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { AgentPanel } from "@/components/agent/agent-panel";
import { AppSideNav } from "@/components/layout/app-side-nav";
import { AppTopNav } from "@/components/layout/app-top-nav";

export default function UserLayout({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();
    const canvasProject = /^\/canvas\/[^/]+/.test(pathname);

    return (
        <div className="flex h-dvh overflow-hidden bg-background text-foreground">
            {!canvasProject ? <AppSideNav /> : null}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <div className="md:hidden">
                    <AppTopNav />
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
            </div>
            <AgentPanel />
        </div>
    );
}
