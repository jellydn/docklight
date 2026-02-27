import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

interface AppDetail {
	name: string;
	status: 'running' | 'stopped';
	gitRemote: string;
	domains: string[];
	processes: Record<string, number>;
}

interface CommandResult {
	command: string;
	exitCode: number;
	stdout: string;
	stderr: string;
}

export function AppDetail() {
	const { name } = useParams<{ name: string }>();
	const [app, setApp] = useState<AppDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [actionResult, setActionResult] = useState<CommandResult | null>(null);
	const [showActionDialog, setShowActionDialog] = useState(false);
	const [pendingAction, setPendingAction] = useState<string | null>(null);

	useEffect(() => {
		if (name) {
			fetchAppDetail();
		}
	}, [name]);

	const fetchAppDetail = async () => {
		try {
			const appData = await apiFetch<AppDetail>(`/apps/${name}`);
			setApp(appData);
			setLoading(false);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load app details');
			setLoading(false);
		}
	};

	const handleAction = async (action: 'restart' | 'rebuild') => {
		setPendingAction(action);
		setShowActionDialog(true);
	};

	const confirmAction = async () => {
		if (!pendingAction || !name) return;

		try {
			const result = await apiFetch<CommandResult>(`/apps/${name}/${pendingAction}`, {
				method: 'POST',
			});
			setActionResult(result);
			setShowActionDialog(false);
			setPendingAction(null);
			fetchAppDetail();
		} catch (err) {
			setActionResult({
				command: `dokku ps:${pendingAction} ${name}`,
				exitCode: 1,
				stdout: '',
				stderr: err instanceof Error ? err.message : 'Action failed',
			});
			setShowActionDialog(false);
			setPendingAction(null);
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center py-12">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (error || !app) {
		return (
			<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
				{error || 'App not found'}
			</div>
		);
	}

	const getStatusBadge = () => {
		const color = app.status === 'running' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
		return (
			<span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
				{app.status}
			</span>
		);
	};

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<div>
					<h1 className="text-2xl font-bold">{app.name}</h1>
					<div className="mt-2">{getStatusBadge()}</div>
				</div>
				<div className="space-x-2">
					<button
						onClick={() => handleAction('restart')}
						className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
					>
						Restart
					</button>
					<button
						onClick={() => handleAction('rebuild')}
						className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
					>
						Rebuild
					</button>
				</div>
			</div>

			{actionResult && (
				<div className="bg-gray-100 rounded p-4 mb-6">
					<h3 className="font-semibold mb-2">Command Output</h3>
					<div className="text-sm">
						<div className="mb-2">
							<strong>Command:</strong> {actionResult.command}
						</div>
						<div className="mb-2">
							<strong>Exit Code:</strong>{' '}
							<span className={actionResult.exitCode === 0 ? 'text-green-600' : 'text-red-600'}>
								{actionResult.exitCode}
							</span>
						</div>
						{actionResult.stdout && (
							<div className="mb-2">
								<strong>Output:</strong>
								<pre className="bg-white p-2 rounded mt-1 overflow-x-auto">
									{actionResult.stdout}
								</pre>
							</div>
						)}
						{actionResult.stderr && (
							<div>
								<strong>Error:</strong>
								<pre className="bg-red-50 p-2 rounded mt-1 overflow-x-auto text-red-800">
									{actionResult.stderr}
								</pre>
							</div>
						)}
					</div>
					<button
						onClick={() => setActionResult(null)}
						className="mt-4 text-blue-600 hover:underline"
					>
						Close
					</button>
				</div>
			)}

			{showActionDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
					<div className="bg-white rounded p-6 max-w-md w-full">
						<h2 className="text-lg font-semibold mb-4">Confirm Action</h2>
						<p className="mb-6">
							Are you sure you want to {pendingAction} <strong>{app.name}</strong>?
						</p>
						<div className="flex justify-end space-x-2">
							<button
								onClick={() => {
									setShowActionDialog(false);
									setPendingAction(null);
								}}
								className="px-4 py-2 border rounded hover:bg-gray-100"
							>
								Cancel
							</button>
							<button
								onClick={confirmAction}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
							>
								Confirm
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="bg-white rounded-lg shadow p-6">
				<h2 className="text-lg font-semibold mb-4">Overview</h2>
				<div className="space-y-4">
					<div>
						<strong className="text-gray-700">Status:</strong>{' '}
						{getStatusBadge()}
					</div>
					<div>
						<strong className="text-gray-700">Git Remote:</strong>{' '}
						<code className="bg-gray-100 px-2 py-1 rounded text-sm">
							{app.gitRemote || '-'}
						</code>
					</div>
					<div>
						<strong className="text-gray-700">Domains:</strong>
						{app.domains.length > 0 ? (
							<ul className="list-disc list-inside ml-4">
								{app.domains.map((domain) => (
									<li key={domain}>{domain}</li>
								))}
							</ul>
						) : (
							<span className="text-gray-400">No domains</span>
						)}
					</div>
					<div>
						<strong className="text-gray-700">Processes:</strong>
						{Object.keys(app.processes).length > 0 ? (
							<div className="mt-2 space-y-1">
								{Object.entries(app.processes).map(([type, count]) => (
									<div key={type}>
										<strong>{type}:</strong> {count}
									</div>
								))}
							</div>
						) : (
							<span className="text-gray-400">No processes running</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
