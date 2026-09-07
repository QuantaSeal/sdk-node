/**
 * MSW server setup for intercepting HTTP requests in tests.
 */
import { setupServer } from "msw/node";

export const server = setupServer();
