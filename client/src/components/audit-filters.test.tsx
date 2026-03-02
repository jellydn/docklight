import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuditFilters, type FilterField } from "./audit-filters.js";

describe("AuditFilters", () => {
	describe("rendering", () => {
		it("should render filter fields", () => {
			// Arrange
			const fields = [
				{ name: "startDate", label: "Start Date", type: "date" as const },
				{ name: "endDate", label: "End Date", type: "date" as const },
				{ name: "search", label: "Search", type: "text" as const, placeholder: "Search..." },
			];
			const filters = { startDate: "", endDate: "", search: "" };

			// Act
			render(
				<AuditFilters
					fields={fields}
					filters={filters}
					onFilterChange={vi.fn()}
					onReset={vi.fn()}
					total={5}
				/>
			);

			// Assert
			expect(screen.getByText("Filters")).toBeInTheDocument();
			expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
			expect(screen.getByLabelText("End Date")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
		});

		it("should render select field with options", () => {
			// Arrange
			const fields = [
				{
					name: "status",
					label: "Status",
					type: "select" as const,
					options: [
						{ value: "all", label: "All" },
						{ value: "active", label: "Active" },
						{ value: "inactive", label: "Inactive" },
					],
				},
			];
			const filters = { status: "all" };

			// Act
			render(
				<AuditFilters
					fields={fields}
					filters={filters}
					onFilterChange={vi.fn()}
					onReset={vi.fn()}
					total={10}
				/>
			);

			// Assert
			expect(screen.getByLabelText("Status")).toBeInTheDocument();
			expect(screen.getByRole("option", { name: "All" })).toBeInTheDocument();
			expect(screen.getByRole("option", { name: "Active" })).toBeInTheDocument();
			expect(screen.getByRole("option", { name: "Inactive" })).toBeInTheDocument();
		});

		it("should display total count with plural label", () => {
			// Arrange
			const fields = [{ name: "search", label: "Search", type: "text" as const }];
			const filters = { search: "" };

			// Act
			render(
				<AuditFilters
					fields={fields}
					filters={filters}
					onFilterChange={vi.fn()}
					onReset={vi.fn()}
					total={5}
					pluralLabel="logs"
				/>
			);

			// Assert
			expect(screen.getByText("5 logs found")).toBeInTheDocument();
		});

		it("should display total count with singular label", () => {
			// Arrange
			const fields = [{ name: "search", label: "Search", type: "text" as const }];
			const filters = { search: "" };

			// Act
			render(
				<AuditFilters
					fields={fields}
					filters={filters}
					onFilterChange={vi.fn()}
					onReset={vi.fn()}
					total={1}
					singularLabel="log"
					pluralLabel="logs"
				/>
			);

			// Assert
			expect(screen.getByText("1 log found")).toBeInTheDocument();
		});

		it("should use default labels when not provided", () => {
			// Arrange
			const fields = [{ name: "search", label: "Search", type: "text" as const }];
			const filters = { search: "" };

			// Act
			render(
				<AuditFilters
					fields={fields}
					filters={filters}
					onFilterChange={vi.fn()}
					onReset={vi.fn()}
					total={1}
				/>
			);

			// Assert
			expect(screen.getByText("1 log found")).toBeInTheDocument();
		});

		it("should render reset button", () => {
			// Arrange
			const fields = [{ name: "search", label: "Search", type: "text" as const }];
			const filters = { search: "" };

			// Act
			render(
				<AuditFilters
					fields={fields}
					filters={filters}
					onFilterChange={vi.fn()}
					onReset={vi.fn()}
					total={5}
				/>
			);

			// Assert
			expect(screen.getByRole("button", { name: "Reset Filters" })).toBeInTheDocument();
		});
	});

	describe("user interactions", () => {
		it("should call onFilterChange when text input changes", async () => {
			// Arrange
			const user = userEvent.setup();
			const onFilterChange = vi.fn();
			const fields = [
				{ name: "search", label: "Search", type: "text" as const, placeholder: "Search..." },
			];
			const filters = { search: "" };

			// Act
			render(
				<AuditFilters
					fields={fields}
					filters={filters}
					onFilterChange={onFilterChange}
					onReset={vi.fn()}
					total={5}
				/>
			);

			const input = screen.getByPlaceholderText("Search...");
			await user.type(input, "test");

			// Assert - type() triggers onChange for each character
			expect(onFilterChange).toHaveBeenCalledTimes(4);
			expect(onFilterChange).toHaveBeenNthCalledWith(4, "search", "t");
		});

		it("should call onFilterChange when date input changes", async () => {
			// Arrange
			const user = userEvent.setup();
			const onFilterChange = vi.fn();
			const fields = [{ name: "startDate", label: "Start Date", type: "date" as const }];
			const filters = { startDate: "" };

			// Act
			render(
				<AuditFilters
					fields={fields}
					filters={filters}
					onFilterChange={onFilterChange}
					onReset={vi.fn()}
					total={5}
				/>
			);

			const input = screen.getByLabelText("Start Date");
			await user.type(input, "2024-01-01");

			// Assert
			expect(onFilterChange).toHaveBeenCalledWith("startDate", "2024-01-01");
		});

		it("should call onFilterChange when select option changes", async () => {
			// Arrange
			const user = userEvent.setup();
			const onFilterChange = vi.fn();
			const fields = [
				{
					name: "status",
					label: "Status",
					type: "select" as const,
					options: [
						{ value: "all", label: "All" },
						{ value: "active", label: "Active" },
					],
				},
			];
			const filters = { status: "all" };

			// Act
			render(
				<AuditFilters
					fields={fields}
					filters={filters}
					onFilterChange={onFilterChange}
					onReset={vi.fn()}
					total={5}
				/>
			);

			const select = screen.getByLabelText("Status");
			await user.selectOptions(select, "active");

			// Assert
			expect(onFilterChange).toHaveBeenCalledWith("status", "active");
		});

		it("should call onReset when reset button is clicked", async () => {
			// Arrange
			const user = userEvent.setup();
			const onReset = vi.fn();
			const fields = [{ name: "search", label: "Search", type: "text" as const }];
			const filters = { search: "existing value" };

			// Act
			render(
				<AuditFilters
					fields={fields}
					filters={filters}
					onFilterChange={vi.fn()}
					onReset={onReset}
					total={5}
				/>
			);

			const resetButton = screen.getByRole("button", { name: "Reset Filters" });
			await user.click(resetButton);

			// Assert
			expect(onReset).toHaveBeenCalledTimes(1);
		});

		it("should display current filter values", () => {
			// Arrange
			const fields = [
				{ name: "search", label: "Search", type: "text" as const },
				{
					name: "status",
					label: "Status",
					type: "select" as const,
					options: [{ value: "active", label: "Active" }],
				},
			];
			const filters = { search: "test query", status: "active" };

			// Act
			render(
				<AuditFilters
					fields={fields}
					filters={filters}
					onFilterChange={vi.fn()}
					onReset={vi.fn()}
					total={5}
				/>
			);

			// Assert
			expect(screen.getByDisplayValue("test query")).toBeInTheDocument();
			expect(screen.getByDisplayValue("Active")).toBeInTheDocument();
		});
	});

	describe("type safety", () => {
		it("should support typed filter objects", () => {
			// Arrange
			type TypedFilters = {
				startDate: string;
				endDate: string;
				status: "all" | "active" | "inactive";
			};

			const fields: FilterField[] = [
				{ name: "startDate", label: "Start Date", type: "date" },
				{ name: "endDate", label: "End Date", type: "date" },
				{
					name: "status",
					label: "Status",
					type: "select",
					options: [
						{ value: "all", label: "All" },
						{ value: "active", label: "Active" },
						{ value: "inactive", label: "Inactive" },
					],
				},
			];

			const filters: TypedFilters = {
				startDate: "2024-01-01",
				endDate: "2024-12-31",
				status: "active",
			};

			const onFilterChange = vi.fn();

			// Act
			render(
				<AuditFilters<TypedFilters>
					fields={fields}
					filters={filters}
					onFilterChange={onFilterChange}
					onReset={vi.fn()}
					total={10}
				/>
			);

			// Assert - component renders without type errors
			expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
			expect(screen.getByDisplayValue("2024-01-01")).toBeInTheDocument();
		});
	});
});
