1|import type { ReactNode, JSX } from "react";
2|import { Navigate } from "react-router-dom";
3|import { useAuth } from "@/contexts/auth-context.js";
4|
5|type RequireAdminProps = {
6|	children: ReactNode;
7|};
8|
9|export function RequireAdmin({ children }: RequireAdminProps): JSX.Element {
10|	const { role, loading } = useAuth();
11|
12|	if (loading) {
13|		return (
14|			<div className="flex items-center justify-center min-h-screen">
15|				<div className="text-muted-foreground">Loading…</div>
16|			</div>
17|		);
18|	}
19|
20|	if (role !== "admin") {
21|		return <Navigate to="/dashboard" replace />;
22|	}
23|
24|	return <>{children}</>;
25|}
26|