export function Login() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100">
			<div className="bg-white p-8 rounded-lg shadow-md w-96">
				<h1 className="text-2xl font-bold mb-6 text-center">Docklight Login</h1>
				<form className="space-y-4">
					<div>
						<label
							htmlFor="password"
							className="block text-sm font-medium mb-2"
						>
							Password
						</label>
						<input
							id="password"
							type="password"
							className="w-full px-3 py-2 border rounded-md"
						/>
					</div>
					<button
						type="submit"
						className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
					>
						Login
					</button>
				</form>
			</div>
		</div>
	);
}
