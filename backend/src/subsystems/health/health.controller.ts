import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('db')
  async checkDatabase() {
    try {
      return await this.health.ping();
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
        message: error instanceof Error ? error.message : 'Error desconocido de base de datos',
      });
    }
  }
}
