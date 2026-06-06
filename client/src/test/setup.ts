import "@testing-library/jest-dom";

// Polyfill HTMLDialogElement methods not implemented in jsdom
HTMLDialogElement.prototype.showModal ??= function () {
	this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close ??= function () {
	this.removeAttribute("open");
};
