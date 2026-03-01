import type { ReactNode } from "react";

export type TabType = "overview" | "config" | "domains" | "logs" | "ssl" | "settings";

export interface ScaleChange {
	processType: string;
	count: number;
}

export interface CopySuccess {
	remote: boolean;
	push: boolean;
}

export interface AppDetailHeaderProps {
	appName: string;
	status: "running" | "stopped";
	onStop: () => void;
	onStart: () => void;
	onRestart: () => void;
	onRebuild: () => void;
}

export interface DialogProps {
	visible: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: ReactNode;
	confirmText?: string;
	cancelText?: string;
	confirmDisabled?: boolean;
	isDestructive?: boolean;
}
