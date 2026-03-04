import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { apiFetch } from "../lib/api.js";
import { queryClient } from "../lib/query-client.js";
import { queryKeys } from "../lib/query-keys.js";
import { UserSchema, type User, type UserRole } from "../lib/schemas.js";

const UsersArraySchema = z.array(UserSchema);

const ROLES: UserRole[] = ["admin", "operator", "viewer"];

const getRoleBadge = (role: UserRole) => {
	const colors: Record<UserRole, string> = {
		admin: "bg-purple-100 text-purple-800",
		operator: "bg-blue-100 text-blue-800",
		viewer: "bg-gray-100 text-gray-800",
	};
	return (
		<span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${colors[role]}`}>
			{role}
		</span>
	);
};

export function Users() {
	const {
		data: users,
		isLoading,
		error,
	} = useQuery({
		queryKey: queryKeys.users,
		queryFn: () => apiFetch("/users", UsersArraySchema),
	});

	// Create form state
	const [newUsername, setNewUsername] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [newRole, setNewRole] = useState<UserRole>("viewer");
	const [createError, setCreateError] = useState("");

	// Edit state
	const [editId, setEditId] = useState<number | null>(null);
	const [editRole, setEditRole] = useState<UserRole>("viewer");
	const [editPassword, setEditPassword] = useState("");
	const [editError, setEditError] = useState("");

	const createUserMutation = useMutation({
		mutationFn: async (userData: { username: string; password: string; role: UserRole }) => {
			return apiFetch("/users", UserSchema, {
				method: "POST",
				body: JSON.stringify(userData),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.users });
			setNewUsername("");
			setNewPassword("");
			setNewRole("viewer");
			setCreateError("");
		},
		onError: (err: Error) => {
			setCreateError(err.message || "Failed to create user");
		},
	});

	const updateUserMutation = useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: number;
			data: { role?: UserRole; password?: string };
		}) => {
			return apiFetch(`/users/${id}`, UserSchema, {
				method: "PUT",
				body: JSON.stringify(data),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.users });
			setEditId(null);
			setEditPassword("");
			setEditError("");
		},
		onError: (err: Error) => {
			setEditError(err.message || "Failed to update user");
		},
	});

	const deleteUserMutation = useMutation({
		mutationFn: async (id: number) => {
			return apiFetch(`/users/${id}`, z.object({ success: z.literal(true) }), {
				method: "DELETE",
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.users });
		},
	});

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setCreateError("");
		createUserMutation.mutate({ username: newUsername, password: newPassword, role: newRole });
	};

	const handleEditSave = async (id: number) => {
		setEditError("");
		const body: { role?: UserRole; password?: string } = { role: editRole };
		if (editPassword) body.password = editPassword;
		updateUserMutation.mutate({ id, data: body });
	};

	const handleDelete = async (id: number, username: string) => {
		if (!confirm(`Delete user "${username}"?`)) return;
		deleteUserMutation.mutate(id);
	};

	const startEdit = (user: User) => {
		setEditId(user.id);
		setEditRole(user.role);
		setEditPassword("");
		setEditError("");
	};

	const userList = users ?? [];
	const errorMessage = error?.message || "";

	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">User Management</h1>

			{/* Create user form */}
			<div className="bg-white rounded-lg shadow p-6 mb-6">
				<h2 className="text-lg font-semibold mb-4">Add User</h2>
				<form onSubmit={handleCreate} className="flex flex-col gap-3">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div>
							<label htmlFor="new-username" className="block text-sm font-medium mb-1">
								Username
							</label>
							<input
								id="new-username"
								type="text"
								value={newUsername}
								onChange={(e) => setNewUsername(e.target.value)}
								className="w-full px-3 py-2 border rounded-md text-sm"
								required
								autoComplete="off"
							/>
						</div>
						<div>
							<label htmlFor="new-password" className="block text-sm font-medium mb-1">
								Password
							</label>
							<input
								id="new-password"
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								className="w-full px-3 py-2 border rounded-md text-sm"
								required
								autoComplete="new-password"
							/>
						</div>
						<div>
							<label htmlFor="new-role" className="block text-sm font-medium mb-1">
								Role
							</label>
							<select
								id="new-role"
								value={newRole}
								onChange={(e) => setNewRole(e.target.value as UserRole)}
								className="w-full px-3 py-2 border rounded-md text-sm"
							>
								{ROLES.map((r) => (
									<option key={r} value={r}>
										{r}
									</option>
								))}
							</select>
						</div>
					</div>
					{createError && <p className="text-red-600 text-sm">{createError}</p>}
					<div>
						<button
							type="submit"
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
						>
							Add User
						</button>
					</div>
				</form>
			</div>

			{/* Users list */}
			<div className="bg-white rounded-lg shadow overflow-hidden">
				<h2 className="text-lg font-semibold p-6 pb-0">Users</h2>
				{errorMessage && <p className="text-red-600 text-sm px-6 py-2">{errorMessage}</p>}
				{isLoading ? (
					<p className="p-6 text-gray-500">Loading…</p>
				) : (
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm mt-4">
							<thead className="bg-gray-50 text-left">
								<tr>
									<th className="px-6 py-3 font-medium text-gray-500">Username</th>
									<th className="px-6 py-3 font-medium text-gray-500">Role</th>
									<th className="px-6 py-3 font-medium text-gray-500 hidden sm:table-cell">
										Created
									</th>
									<th className="px-6 py-3 font-medium text-gray-500">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{userList.map((user) => (
									<tr key={user.id}>
										<td className="px-6 py-3 font-medium">{user.username}</td>
										<td className="px-6 py-3 whitespace-nowrap">
											{editId === user.id ? (
												<select
													value={editRole}
													onChange={(e) => setEditRole(e.target.value as UserRole)}
													className="border rounded px-2 py-1"
												>
													{ROLES.map((r) => (
														<option key={r} value={r}>
															{r}
														</option>
													))}
												</select>
											) : (
												getRoleBadge(user.role)
											)}
										</td>
										<td className="px-6 py-3 text-gray-500 whitespace-nowrap hidden sm:table-cell">
											{new Date(user.createdAt).toLocaleDateString()}
										</td>
										<td className="px-6 py-3 whitespace-nowrap">
											{editId === user.id ? (
												<div className="flex items-center gap-2 flex-wrap">
													<input
														type="password"
														placeholder="New password (optional)"
														aria-label={`New password for ${user.username}`}
														value={editPassword}
														onChange={(e) => setEditPassword(e.target.value)}
														className="border rounded px-2 py-1 text-xs w-40"
														autoComplete="new-password"
													/>
													{editError && <span className="text-red-600 text-xs">{editError}</span>}
													<button
														type="button"
														onClick={() => handleEditSave(user.id)}
														className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
													>
														Save
													</button>
													<button
														type="button"
														onClick={() => setEditId(null)}
														className="px-3 py-1 bg-gray-200 rounded text-xs hover:bg-gray-300"
													>
														Cancel
													</button>
												</div>
											) : (
												<div className="flex items-center gap-2">
													<button
														type="button"
														onClick={() => startEdit(user)}
														className="px-3 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200"
													>
														Edit
													</button>
													<button
														type="button"
														onClick={() => handleDelete(user.id, user.username)}
														className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
													>
														Delete
													</button>
												</div>
											)}
										</td>
									</tr>
								))}
								{userList.length === 0 && (
									<tr>
										<td colSpan={4} className="px-6 py-4 text-center text-gray-400">
											No users yet
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
