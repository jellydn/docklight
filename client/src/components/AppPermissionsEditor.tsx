import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState, type JSX } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api.js";
import { AppPermissionSchema, type AppPermission, type User } from "@/lib/schemas.js";

const PERMISSIONS_SCHEMA = z.array(AppPermissionSchema);
type EditablePermission = Pick<AppPermission, "action" | "scope" | "effect"> & { clientId: string };

interface AppPermissionsEditorProps {
	user: User;
	onClose: () => void;
}

export function AppPermissionsEditor({ user, onClose }: AppPermissionsEditorProps): JSX.Element {
	const [permissions, setPermissions] = useState<EditablePermission[]>([]);
	const { data, isLoading } = useQuery({
		queryKey: ["users", user.id, "permissions"],
		queryFn: () => apiFetch(`/users/${user.id}/permissions`, PERMISSIONS_SCHEMA),
	});

	useEffect(() => {
		if (data) {
			setPermissions(
				data.map(({ action, effect, scope }) => ({
					action,
					effect,
					scope,
					clientId: crypto.randomUUID(),
				}))
			);
		}
	}, [data]);

	const saveMutation = useMutation({
		mutationFn: () =>
			apiFetch(`/users/${user.id}/permissions`, PERMISSIONS_SCHEMA, {
				method: "PUT",
				body: JSON.stringify({
					permissions: permissions.map(({ action, effect, scope }) => ({ action, effect, scope })),
				}),
			}),
		onSuccess: onClose,
	});

	const updatePermission = (index: number, updates: Partial<EditablePermission>): void => {
		setPermissions((current) =>
			current.map((permission, position) =>
				position === index ? { ...permission, ...updates } : permission
			)
		);
	};

	return (
		<div className="border-t border-border bg-muted/30 p-5">
			<div className="flex items-start justify-between gap-4 mb-4">
				<div>
					<h3 className="font-semibold">App permissions for {user.username}</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Specific app rules override all-app rules. Without a matching rule, the user role
						applies.
					</p>
				</div>
				<Button type="button" variant="ghost" onClick={onClose}>
					Close
				</Button>
			</div>

			{isLoading ? (
				<p className="text-sm text-muted-foreground">Loading permissions…</p>
			) : (
				<div className="space-y-3">
					{permissions.map((permission, index) => (
						<div
							key={permission.clientId}
							className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr_auto] gap-2"
						>
							<select
								aria-label={`Action ${index + 1}`}
								value={permission.action}
								onChange={(event) =>
									updatePermission(index, {
										action: event.target.value as EditablePermission["action"],
									})
								}
								className="px-3 py-2 border border-border rounded-md bg-background"
							>
								<option value="create">Create</option>
								<option value="read">Read</option>
								<option value="update">Update</option>
								<option value="delete">Delete</option>
							</select>
							<select
								aria-label={`Effect ${index + 1}`}
								value={permission.effect}
								onChange={(event) =>
									updatePermission(index, {
										effect: event.target.value as EditablePermission["effect"],
									})
								}
								className="px-3 py-2 border border-border rounded-md bg-background"
							>
								<option value="allow">Allow</option>
								<option value="deny">Deny</option>
							</select>
							<input
								aria-label={`App scope ${index + 1}`}
								value={permission.scope ?? ""}
								onChange={(event) => updatePermission(index, { scope: event.target.value || null })}
								placeholder="All apps"
								className="px-3 py-2 border border-border rounded-md bg-background"
							/>
							<Button
								type="button"
								variant="ghost"
								onClick={() =>
									setPermissions((current) => current.filter((_, position) => position !== index))
								}
							>
								Remove
							</Button>
						</div>
					))}
					<div className="flex flex-wrap gap-2 pt-2">
						<Button
							type="button"
							variant="secondary"
							onClick={() =>
								setPermissions((current) => [
									...current,
									{
										action: "update",
										effect: "deny",
										scope: null,
										clientId: crypto.randomUUID(),
									},
								])
							}
						>
							Add rule
						</Button>
						<Button
							type="button"
							onClick={() => saveMutation.mutate()}
							disabled={saveMutation.isPending}
						>
							Save permissions
						</Button>
					</div>
					{saveMutation.error && (
						<p className="text-sm text-destructive">{saveMutation.error.message}</p>
					)}
				</div>
			)}
		</div>
	);
}
