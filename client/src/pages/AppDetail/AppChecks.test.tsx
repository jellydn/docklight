import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ChecksReport } from "../../lib/schemas.js";
import { AppChecks } from "./AppChecks.js";

const mockChecksReport: ChecksReport = {
	disabledList: "none",
	skippedList: "none",
	computedDisabled: false,
	computedSkipAll: false,
	computedSkipped: "",
	globalDisabled: false,
	globalSkipAll: false,
	globalSkipped: "",
};

const mockDisabledChecksReport: ChecksReport = {
	...mockChecksReport,
	computedDisabled: true,
	disabledList: "web worker",
};

const mockSkipAllReport: ChecksReport = {
	...mockChecksReport,
	computedSkipAll: true,
	skippedList: "web",
	computedSkipped: "web",
};

describe("AppChecks", () => {
	describe("loading state", () => {
		it("should render loading spinner when loading is true", () => {
			render(
				<AppChecks
					checksReport={null}
					loading={true}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const spinner = document.querySelector(".animate-spin");
			expect(spinner).toBeInTheDocument();
		});
	});

	describe("error state", () => {
		it("should render error message when error is present", () => {
			const errorMessage = "Failed to fetch checks report";

			render(
				<AppChecks
					checksReport={null}
					loading={false}
					error={errorMessage}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});
	});

	describe("checks report display", () => {
		it("should render health checks heading", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.getByText("Health Checks")).toBeInTheDocument();
		});

		it("should display checks disabled status as enabled when false", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.getByText("Enabled")).toBeInTheDocument();
		});

		it("should display checks disabled status as disabled when true", () => {
			render(
				<AppChecks
					checksReport={mockDisabledChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.getByText("Disabled")).toBeInTheDocument();
		});

		it("should display skip all status as no when false", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.getByText("No")).toBeInTheDocument();
		});

		it("should display skip all status as yes when true", () => {
			render(
				<AppChecks
					checksReport={mockSkipAllReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.getByText("Yes")).toBeInTheDocument();
		});

		it("should display disabled process types list", () => {
			render(
				<AppChecks
					checksReport={mockDisabledChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.getByText("Disabled Processes")).toBeInTheDocument();
			expect(screen.getByText("web worker")).toBeInTheDocument();
		});

		it("should hide disabled processes when list is 'none'", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.queryByText("Disabled Processes")).not.toBeInTheDocument();
		});

		it("should hide skipped processes when list is 'none'", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.queryByText("Skipped Processes")).not.toBeInTheDocument();
		});

		it("should display skipped processes when present", () => {
			render(
				<AppChecks
					checksReport={mockSkipAllReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.getByText("Skipped Processes")).toBeInTheDocument();
			expect(screen.getByText("web")).toBeInTheDocument();
		});

		it("should show global disabled when true", () => {
			const reportWithGlobalDisabled: ChecksReport = {
				...mockChecksReport,
				globalDisabled: true,
			};

			render(
				<AppChecks
					checksReport={reportWithGlobalDisabled}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.getByText("Global Disabled")).toBeInTheDocument();
		});

		it("should hide global disabled when false", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.queryByText("Global Disabled")).not.toBeInTheDocument();
		});
	});

	describe("manage checks section", () => {
		it("should not render manage checks when canModify is false", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={false}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.queryByText("Manage Checks")).not.toBeInTheDocument();
		});

		it("should render manage checks when canModify is true", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.getByText("Manage Checks")).toBeInTheDocument();
		});

		it("should render all action buttons", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.getByText("Enable Checks")).toBeInTheDocument();
			expect(screen.getByText("Disable Checks")).toBeInTheDocument();
			expect(screen.getByText("Skip Checks")).toBeInTheDocument();
			expect(screen.getByText("Run Checks")).toBeInTheDocument();
		});

		it("should render help text explaining actions", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.getByText(/Enable\/Disable:/)).toBeInTheDocument();
			expect(screen.getByText(/Skip:/)).toBeInTheDocument();
			expect(screen.getByText(/Run:/)).toBeInTheDocument();
		});
	});

	describe("enable button behavior", () => {
		it("should be enabled when checks are disabled", () => {
			const onEnable = vi.fn();

			render(
				<AppChecks
					checksReport={mockDisabledChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={onEnable}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const enableButton = screen.getByText("Enable Checks").closest("button");
			expect(enableButton).not.toBeDisabled();
		});

		it("should be disabled when checks are already enabled", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const enableButton = screen.getByText("Enable Checks").closest("button");
			expect(enableButton).toBeDisabled();
		});

		it("should be disabled during enabling operation", () => {
			render(
				<AppChecks
					checksReport={mockDisabledChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={true}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const enableButton = screen.getByText("Enabling...").closest("button");
			expect(enableButton).toBeDisabled();
		});

		it("should call onEnable when clicked", async () => {
			const user = userEvent.setup();
			const onEnable = vi.fn();

			render(
				<AppChecks
					checksReport={mockDisabledChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={onEnable}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const enableButton = screen.getByText("Enable Checks").closest("button");
			await user.click(enableButton!);

			expect(onEnable).toHaveBeenCalledTimes(1);
		});
	});

	describe("disable button behavior", () => {
		it("should be enabled when checks are enabled", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const disableButton = screen.getByText("Disable Checks").closest("button");
			expect(disableButton).not.toBeDisabled();
		});

		it("should be disabled when checks are already disabled", () => {
			render(
				<AppChecks
					checksReport={mockDisabledChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const disableButton = screen.getByText("Disable Checks").closest("button");
			expect(disableButton).toBeDisabled();
		});

		it("should be disabled during disabling operation", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={true}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const disableButton = screen.getByText("Disabling...").closest("button");
			expect(disableButton).toBeDisabled();
		});

		it("should call onDisable when clicked", async () => {
			const user = userEvent.setup();
			const onDisable = vi.fn();

			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={onDisable}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const disableButton = screen.getByText("Disable Checks").closest("button");
			await user.click(disableButton!);

			expect(onDisable).toHaveBeenCalledTimes(1);
		});
	});

	describe("skip button behavior", () => {
		it("should be enabled when skip all is false", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const skipButton = screen.getByText("Skip Checks").closest("button");
			expect(skipButton).not.toBeDisabled();
		});

		it("should be disabled when skip all is already true", () => {
			render(
				<AppChecks
					checksReport={mockSkipAllReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const skipButton = screen.getByText("Skip Checks").closest("button");
			expect(skipButton).toBeDisabled();
		});

		it("should be disabled during skipping operation", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={true}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const skipButton = screen.getByText("Skipping...").closest("button");
			expect(skipButton).toBeDisabled();
		});

		it("should call onSkip when clicked", async () => {
			const user = userEvent.setup();
			const onSkip = vi.fn();

			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={onSkip}
					onRun={vi.fn()}
				/>
			);

			const skipButton = screen.getByText("Skip Checks").closest("button");
			await user.click(skipButton!);

			expect(onSkip).toHaveBeenCalledTimes(1);
		});
	});

	describe("run button behavior", () => {
		it("should be enabled when not running", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const runButton = screen.getByText("Run Checks").closest("button");
			expect(runButton).not.toBeDisabled();
		});

		it("should be disabled during running operation", () => {
			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={true}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const runButton = screen.getByText("Running...").closest("button");
			expect(runButton).toBeDisabled();
		});

		it("should call onRun when clicked", async () => {
			const user = userEvent.setup();
			const onRun = vi.fn();

			render(
				<AppChecks
					checksReport={mockChecksReport}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={onRun}
				/>
			);

			const runButton = screen.getByText("Run Checks").closest("button");
			await user.click(runButton!);

			expect(onRun).toHaveBeenCalledTimes(1);
		});
	});

	describe("null report handling", () => {
		it("should not crash when checksReport is null", () => {
			render(
				<AppChecks
					checksReport={null}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			expect(screen.getByText("Health Checks")).toBeInTheDocument();
		});

		it("should enable enable button when report is null", () => {
			render(
				<AppChecks
					checksReport={null}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const enableButton = screen.getByText("Enable Checks").closest("button");
			expect(enableButton).not.toBeDisabled();
		});

		it("should disable disable button when report is null", () => {
			render(
				<AppChecks
					checksReport={null}
					loading={false}
					error={null}
					canModify={true}
					enabling={false}
					disabling={false}
					skipping={false}
					running={false}
					onEnable={vi.fn()}
					onDisable={vi.fn()}
					onSkip={vi.fn()}
					onRun={vi.fn()}
				/>
			);

			const disableButton = screen.getByText("Disable Checks").closest("button");
			expect(disableButton).toBeDisabled();
		});
	});
});
