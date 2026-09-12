import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	}),
});

// Polyfill HTMLDialogElement methods not implemented in jsdom
HTMLDialogElement.prototype.showModal ??= function () {
	this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close ??= function () {
	this.removeAttribute("open");
};
