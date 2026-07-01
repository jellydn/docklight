import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme-context.js";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
	variant?: "sidebar" | "header";
	className?: string;
}

export function ThemeToggle({ variant = "sidebar", className }: ThemeToggleProps) {
	const { theme, toggleTheme } = useTheme();
	const isDark = theme === "dark";
	const label = isDark ? "Switch to light mode" : "Switch to dark mode";

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			onClick={toggleTheme}
			aria-label={label}
			title={label}
			className={cn(
				variant === "sidebar"
					? "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-foreground/10"
					: "text-muted-foreground hover:text-foreground",
				className
			)}
		>
			{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
		</Button>
	);
}
