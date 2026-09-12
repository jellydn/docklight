import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import {
	applyTheme,
	getStoredTheme,
	persistTheme,
	resolveTheme,
	type Theme,
} from "@/lib/theme.js";

interface ThemeContextValue {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<Theme>(() => resolveTheme(getStoredTheme()));
	const hasUserPreference = useRef(getStoredTheme() !== null);

	useEffect(() => {
		applyTheme(theme);
		if (hasUserPreference.current) {
			persistTheme(theme);
		}
	}, [theme]);

	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => {
			if (!hasUserPreference.current) {
				setThemeState(media.matches ? "dark" : "light");
			}
		};
		media.addEventListener("change", handleChange);
		return () => media.removeEventListener("change", handleChange);
	}, []);

	const setTheme = useCallback((next: Theme) => {
		hasUserPreference.current = true;
		setThemeState(next);
	}, []);

	const toggleTheme = useCallback(() => {
		hasUserPreference.current = true;
		setThemeState((current) => (current === "dark" ? "light" : "dark"));
	}, []);

	const value = useMemo(
		() => ({
			theme,
			setTheme,
			toggleTheme,
		}),
		[theme, setTheme, toggleTheme]
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within ThemeProvider");
	}
	return context;
}
