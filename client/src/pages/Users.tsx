import { useEffect, useState } from "react";
import { z } from "zod";
import { apiFetch } from "../lib/api.js";
import { UserSchema, type User, type UserRole } from "../lib/schemas.js";

const UsersArraySchema = z.array(UserSchema);

const ROLES: UserRole[] = ["admin", "operator", "viewer"];

export function Users() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

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

	const loadUsers = async () => {
		try {
			setLoading(true);
			const data = await apiFetch("/users", UsersArraySchema);
			setUsers(data);
			setError("");
		} catch (_err) {
			setError("Failed to load users");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadUsers();
	}, []);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setCreateError("");
		try {
			await apiFetch("/users", UserSchema, {
				method: "POST",
				body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
			});
			setNewUsername("");
			setNewPassword("");
			setNewRole("viewer");
			await loadUsers();
		} catch (err) {
			setCreateError(err instanceof Error ? err.message : "Failed to create user");
		}
	};

	const handleEditSave = async (id: number) => {
		setEditError("");
		try {
			const body: { role?: UserRole; password?: string } = { role: editRole };
			if (editPassword) body.password = editPassword;
			await apiFetch(`/users/${id}`, UserSchema, {
				method: "PUT",
				body: JSON.stringify(body),
			});
			setEditId(null);
			setEditPassword("");
			await loadUsers();
		} catch (err) {
			setEditError(err instanceof Error ? err.message : "Failed to update user");
		}
	};

	const handleDelete = async (id: number, username: string) => {
		if (!confirm(`Delete user "${username}"?`)) return;
		try {
			await apiFetch(`/users/${id}`, z.object({ success: z.literal(true) }), {
				method: "DELETE",
			});
			await loadUsers();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete user");
		}
	};

	const startEdit = (user: User) => {
		setEditId(user.id);
		setEditRole(user.role);
		setEditPassword("");
		setEditError("");
	};

	return (
		<div className="max-w-3xl mx-auto">
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
				{error && <p className="text-red-600 text-sm px-6 py-2">{error}</p>}
				{loading ? (
					<p className="p-6 text-gray-500">Loading…</p>
				) : (
					<table className="w-full text-sm mt-4">
						<thead className="bg-gray-50 text-left">
							<tr>
								<th className="px-6 py-3 font-medium text-gray-500">Username</th>
								<th className="px-6 py-3 font-medium text-gray-500">Role</th>
								<th className="px-6 py-3 font-medium text-gray-500">Created</th>
								<th className="px-6 py-3 font-medium text-gray-500">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{users.map((user) => (
								<tr key={user.id}>
									<td className="px-6 py-3 font-medium">{user.username}</td>
									<td className="px-6 py-3">
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
											<span className="capitalize">{user.role}</span>
										)}
									</td>
									<td className="px-6 py-3 text-gray-500">
										{new Date(user.createdAt).toLocaleDateString()}
									</td>
									<td className="px-6 py-3">
										{editId === user.id ? (
											<div className="flex items-center gap-2 flex-wrap">
												<input
													type="password"
													placeholder="New password (optional)"
													value={editPassword}
													onChange={(e) => setEditPassword(e.target.value)}
													className="border rounded px-2 py-1 text-xs w-40"
													autoComplete="new-password"
												/>
												{editError && (
													<span className="text-red-600 text-xs">{editError}</span>
												)}
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
							{users.length === 0 && (
								<tr>
									<td colSpan={4} className="px-6 py-4 text-center text-gray-400">
										No users yet
									</td>
								</tr>
							)}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
