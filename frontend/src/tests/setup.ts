import "@testing-library/jest-dom";
import { setBackendUrlForTests } from "../config/env";

setBackendUrlForTests("http://localhost:8080");

// Monaco Editor is mocked via jest.config.js moduleNameMapper
