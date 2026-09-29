import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "@shared/infrastructure/http/public.decorator";
import { HealthService } from "./health.service";

/**
 * Liveness and readiness probes.
 *
 * Marked public at the class level so any probe added later inherits it.
 * A health endpoint behind authentication is useless to the things that
 * consume it — Docker's healthcheck, and any orchestrator probe — since
 * none of them hold credentials: they would read the 401 as a dead
 * service and never let anything depending on it start.
 *
 * The payload is deliberately thin (status, reachability, latency) so
 * being open costs nothing: it reveals no data and no configuration.
 */
@Public()
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get("db")
  async checkDatabase() {
    try {
      return await this.health.ping();
    } catch (error) {
      throw new ServiceUnavailableException({
        status: "error",
        database: "down",
        message: error instanceof Error ? error.message : "Unknown database error",
      });
    }
  }
}
