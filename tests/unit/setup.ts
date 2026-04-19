import "@testing-library/jest-dom";
import { vi } from "vitest";

// Prevent "server-only" from throwing in the jsdom test environment.
// Modules that are server-only are excluded from coverage; this mock
// allows their pure-function exports to be imported in unit tests.
vi.mock("server-only", () => ({}));
