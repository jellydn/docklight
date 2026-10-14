import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState, type JSX } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api.js";
import { PermissionSchema, type Permission, type User } from "@/lib/schemas.js";
import { queryClient } from "@/lib/query-client.js";
import { queryKeys } from "@/lib/query-keys.js";

const PERMISSIONS_SCHEMA = z.array(PermissionSchema);
type EditablePermission = Pick<Permission, "resource" | "action" | "scope" | "effect"> & {
	clientId: string;
};

interface PermissionsEditorProps {
	user: User;
	onClose: () => void;
}

export function PermissionsEditor({ user, onClose }: PermissionsEditorProps): JSX.Element {
	const [permissions, setPermissions] = useState<EditablePermission[]>([]);
	const { data, isLoading } = useQuery({
		queryKey: ["users", user.id, "permissions"],
		queryFn: () => apiFetch(`/users/${user.id}/permissions`, PERMISSIONS_SCHEMA),
	});

	useEffect(() => {
		if (data) {
			setPermissions(
				data.map(({ resource, action, effect, scope }) => ({
					resource,
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
					permissions: permissions.map(({ resource, action, effect, scope }) => ({
						resource,
						action,
						effect,
						scope,
					})),
				}),
			}),
		onSuccess: async (): Promise<void> => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
			onClose();
		},
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
					<h3 className="font-semibold">Permissions for {user.username}</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Named resource rules override all-resource rules. Without a matching rule, the user role
						applies. User scopes are usernames. Global configuration uses an empty scope. Only
						administrators can change roles or administrator accounts.
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
							className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_2fr_auto] gap-2"
						>
							<select
								aria-label={`Resource ${index + 1}`}
								value={permission.resource}
								onChange={(event) =>
									updatePermission(index, {
										resource: event.target.value as Permission["resource"],
										scope: null,
									})
								}
								className="px-3 py-2 border border-border rounded-md bg-background"
							>
								<option value="apps">Apps</option>
								<option value="databases">Databases</option>
								<option value="plugins">Plugins</option>
								<option value="config">Global configuration</option>
								<option value="users">Users</option>
							</select>
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
								aria-label={`Resource scope ${index + 1}`}
								value={permission.scope ?? ""}
								disabled={permission.resource === "config"}
								onChange={(event) => updatePermission(index, { scope: event.target.value || null })}
								placeholder="All resources of this type"
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
										resource: "apps",
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
