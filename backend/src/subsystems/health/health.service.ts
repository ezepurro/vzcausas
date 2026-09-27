import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";

@Injectable()
export class HealthService {
	constructor(private readonly prisma: PrismaService) {}

	async ping() {
		const startedAt = Date.now();
		await this.prisma.$queryRaw`SELECT 1`;
		return {
			status: "ok",
			database: "up",
			latencyMs: Date.now() - startedAt,
		};
	}
}
