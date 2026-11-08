import { IsIn, IsOptional } from "class-validator";

/**
 * Query of `POST /internal/deadlines/daily-run`. It arrives as text, so `dev` is
 * `"true"` or `"false"`; the controller decides what it means.
 */
export class DailyRunQueryDto {
  /**
   * Development shortcut used by the bell of the frontend: wipes the history of
   * notifications sent and runs. Only honoured when `NODE_ENV=development`.
   */
  @IsOptional()
  @IsIn(["true", "false"], { message: "Debe ser true o false." })
  dev?: string;
}
