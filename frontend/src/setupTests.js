import "@testing-library/jest-dom";

if (!globalThis.crypto) {
	globalThis.crypto = {};
}

if (!globalThis.crypto.randomUUID) {
	globalThis.crypto.randomUUID = () =>
		`uuid-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

if (!globalThis.ResizeObserver) {
	globalThis.ResizeObserver = class ResizeObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
}
