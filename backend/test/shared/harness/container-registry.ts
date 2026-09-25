import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

const KEY = "__VZ_TEST_DB_CONTAINER__";

export function setContainer(container: StartedPostgreSqlContainer): void {
	(globalThis as any)[KEY] = container;
}

export function getContainer(): StartedPostgreSqlContainer | undefined {
	return (globalThis as any)[KEY];
}
