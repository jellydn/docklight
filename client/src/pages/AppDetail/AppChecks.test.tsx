import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ChecksReport } from "../../lib/schemas.js";
import { AppChecks } from "./AppChecks.js";

const mockChecksReport: ChecksReport = {
	disabled: false,
	skipped: false,
	disabledList: "none",
	skippedList: "none",
	waitToRetire: 60,
};

const mockDisabledChecksReport: ChecksReport = {
	disabled: true,
	skipped: false,
	disabledList: "_all_",
	skippedList: "none",
	waitToRetire: 60,
};

const mockSkipAllReport: ChecksReport = {
	disabled: false,
	skipped: true,
	disabledList: "none",
	skippedList: "_all_",
	waitToRetire: 60,
};

const defaultProps = {
	loading: false,
	error: null,
	canModify: true,
	enabling: false,
	disabling: false,
	skipping: false,
	running: false,
	onEnable: vi.fn(),
	onDisable: vi.fn(),
	onSkip: vi.fn(),
	onRun: vi.fn(),
};

describe("AppChecks", () => {
	describe("loading state", () => {
		it("should render loading spinner when loading is true", () => {
			render(<AppChecks {...defaultProps} checksReport={null} loading={true} />);

			const spinner = document.querySelector(".animate-spin");
			expect(spinner).toBeInTheDocument();
		});
	});

	describe("error state", () => {
		it("should render error message when error is present", () => {
			const errorMessage = "Failed to fetch checks report";
			render(<AppChecks {...defaultProps} checksReport={null} error={errorMessage} />);

			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});
	});

	describe("status banner", () => {
		it("should show active status when checks are enabled", () => {
			render(<AppChecks {...defaultProps} checksReport={mockChecksReport} />);

			expect(screen.getByText("Zero-downtime deploys are active")).toBeInTheDocument();
		});

		it("should show disabled warning when checks are disabled", () => {
			render(<AppChecks {...defaultProps} checksReport={mockDisabledChecksReport} />);

			expect(screen.getByText("Zero-downtime deploys are disabled")).toBeInTheDocument();
		});

		it("should show skipped status when checks are skipped", () => {
			render(<AppChecks {...defaultProps} checksReport={mockSkipAllReport} />);

			expect(screen.getByText("Checks are being skipped")).toBeInTheDocument();
		});
	});

	describe("manage checks section", () => {
		it("should not render manage checks when canModify is false", () => {
			render(
				<AppChecks {...defaultProps} checksReport={mockChecksReport} canModify={false} />,
			);

			expect(screen.queryByText("Manage Checks")).not.toBeInTheDocument();
		});

		it("should render manage checks when canModify is true", () => {
			render(<AppChecks {...defaultProps} checksReport={mockChecksReport} />);

			expect(screen.getByText("Manage Checks")).toBeInTheDocument();
		});

		it("should show Disable button when checks are enabled", () => {
			render(<AppChecks {...defaultProps} checksReport={mockChecksReport} />);

			expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "Enable" })).not.toBeInTheDocument();
		});

		it("should show Enable button when checks are disabled", () => {
			render(<AppChecks {...defaultProps} checksReport={mockDisabledChecksReport} />);

			expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "Disable" })).not.toBeInTheDocument();
		});

		it("should render inline descriptions for each action", () => {
			render(<AppChecks {...defaultProps} checksReport={mockChecksReport} />);

			expect(screen.getByText("Deploy Checks")).toBeInTheDocument();
			expect(screen.getByText(/Skip the default wait period/)).toBeInTheDocument();
			expect(screen.getByText(/Manually run health checks/)).toBeInTheDocument();
		});
	});

	describe("enable button behavior", () => {
		it("should be clickable when checks are disabled", async () => {
			const user = userEvent.setup();
			const onEnable = vi.fn();

			render(
				<AppChecks
					{...defaultProps}
					checksReport={mockDisabledChecksReport}
					onEnable={onEnable}
				/>,
			);

			const enableButton = screen.getByRole("button", { name: "Enable" });
			expect(enableButton).not.toBeDisabled();
			await user.click(enableButton);

			expect(onEnable).toHaveBeenCalledTimes(1);
		});

		it("should not render when checks are already enabled", () => {
			render(<AppChecks {...defaultProps} checksReport={mockChecksReport} />);

			expect(screen.queryByRole("button", { name: "Enable" })).not.toBeInTheDocument();
		});

		it("should be disabled during enabling operation", () => {
			render(
				<AppChecks
					{...defaultProps}
					checksReport={mockDisabledChecksReport}
					enabling={true}
				/>,
			);

			const enableButton = screen.getByRole("button", { name: "Enabling..." });
			expect(enableButton).toBeDisabled();
		});
	});

	describe("disable button behavior", () => {
		it("should be clickable when checks are enabled", async () => {
			const user = userEvent.setup();
			const onDisable = vi.fn();

			render(
				<AppChecks
					{...defaultProps}
					checksReport={mockChecksReport}
					onDisable={onDisable}
				/>,
			);

			const disableButton = screen.getByRole("button", { name: "Disable" });
			expect(disableButton).not.toBeDisabled();
			await user.click(disableButton);

			expect(onDisable).toHaveBeenCalledTimes(1);
		});

		it("should not render when checks are already disabled", () => {
			render(<AppChecks {...defaultProps} checksReport={mockDisabledChecksReport} />);

			expect(screen.queryByRole("button", { name: "Disable" })).not.toBeInTheDocument();
		});

		it("should be disabled during disabling operation", () => {
			render(
				<AppChecks {...defaultProps} checksReport={mockChecksReport} disabling={true} />,
			);

			const disableButton = screen.getByRole("button", { name: "Disabling..." });
			expect(disableButton).toBeDisabled();
		});
	});

	describe("skip button behavior", () => {
		it("should be enabled when skip all is false", () => {
			render(<AppChecks {...defaultProps} checksReport={mockChecksReport} />);

			const skipButton = screen.getByRole("button", { name: "Skip" });
			expect(skipButton).not.toBeDisabled();
		});

		it("should be disabled when skip all is already true", () => {
			render(<AppChecks {...defaultProps} checksReport={mockSkipAllReport} />);

			const skipButton = screen.getByRole("button", { name: "Skip" });
			expect(skipButton).toBeDisabled();
		});

		it("should be disabled during skipping operation", () => {
			render(
				<AppChecks {...defaultProps} checksReport={mockChecksReport} skipping={true} />,
			);

			const skipButton = screen.getByRole("button", { name: "Skipping..." });
			expect(skipButton).toBeDisabled();
		});

		it("should call onSkip when clicked", async () => {
			const user = userEvent.setup();
			const onSkip = vi.fn();

			render(
				<AppChecks {...defaultProps} checksReport={mockChecksReport} onSkip={onSkip} />,
			);

			const skipButton = screen.getByRole("button", { name: "Skip" });
			await user.click(skipButton);

			expect(onSkip).toHaveBeenCalledTimes(1);
		});
	});

	describe("run button behavior", () => {
		it("should be enabled when not running", () => {
			render(<AppChecks {...defaultProps} checksReport={mockChecksReport} />);

			const runButton = screen.getByRole("button", { name: "Run" });
			expect(runButton).not.toBeDisabled();
		});

		it("should be disabled during running operation", () => {
			render(
				<AppChecks {...defaultProps} checksReport={mockChecksReport} running={true} />,
			);

			const runButton = screen.getByRole("button", { name: "Running..." });
			expect(runButton).toBeDisabled();
		});

		it("should call onRun when clicked", async () => {
			const user = userEvent.setup();
			const onRun = vi.fn();

			render(
				<AppChecks {...defaultProps} checksReport={mockChecksReport} onRun={onRun} />,
			);

			const runButton = screen.getByRole("button", { name: "Run" });
			await user.click(runButton);

			expect(onRun).toHaveBeenCalledTimes(1);
		});
	});

	describe("null report handling", () => {
		it("should not crash when checksReport is null", () => {
			render(<AppChecks {...defaultProps} checksReport={null} />);

			expect(screen.getByText("Zero-Downtime Checks")).toBeInTheDocument();
		});

		it("should show enable button when report is null", () => {
			render(<AppChecks {...defaultProps} checksReport={null} />);

			const enableButton = screen.getByRole("button", { name: "Enable" });
			expect(enableButton).not.toBeDisabled();
		});

		it("should not render disable button when report is null", () => {
			render(<AppChecks {...defaultProps} checksReport={null} />);

			expect(screen.queryByRole("button", { name: "Disable" })).not.toBeInTheDocument();
		});
	});
});
