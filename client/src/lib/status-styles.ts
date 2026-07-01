import { cn } from "@/lib/utils";

export type AppStatus = "running" | "stopped" | string;

export type BadgeVariant = "success" | "warning" | "error";

export function badgeClass(variant: BadgeVariant): string {
	const variants = {
		success: "bg-success-surface text-success-on-surface",
		warning: "bg-warning-surface text-warning-on-surface",
		error: "bg-destructive-surface text-destructive-on-surface",
	};
	return cn(
		"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
		variants[variant]
	);
}

export function statusBadgeClass(status: AppStatus): string {
	return badgeClass(status === "running" ? "success" : "error");
}

export function statusDotClass(status: AppStatus): string {
	return status === "running" ? "bg-success-on-surface" : "bg-destructive-on-surface";
}

export function alertBannerClass(
	variant: "error" | "success" | "warning" = "error"
): string {
	const variants = {
		error: "bg-destructive-surface text-destructive-on-surface border-destructive/30",
		success: "bg-success-surface text-success-on-surface border-success/30",
		warning: "bg-warning-surface text-warning-on-surface border-warning/30",
	};
	return cn("rounded-md border px-4 py-3 text-sm", variants[variant]);
}

export function healthBannerClass(status: "ok" | "warning" | "critical"): string {
	const variants = {
		ok: "bg-success-surface text-success-on-surface border-success/30",
		warning: "bg-warning-surface text-warning-on-surface border-warning/30",
		critical: "bg-destructive-surface text-destructive-on-surface border-destructive/30",
	};
	return cn("rounded-md border px-4 py-3 text-sm font-medium", variants[status]);
}

export function healthBarClass(status: "ok" | "warning" | "critical"): string {
	const variants = {
		ok: "bg-success",
		warning: "bg-warning",
		critical: "bg-destructive",
	};
	return variants[status];
}
