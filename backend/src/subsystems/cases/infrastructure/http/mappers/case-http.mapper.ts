import { CaseListItem } from "../../../core/application/read-models/case-list-item";
import { CaseResponseDto } from "../dtos/case.response.dto";

export class CaseHttpMapper {
  static toResponse(item: CaseListItem): CaseResponseDto {
    const dto = new CaseResponseDto();
    dto.id = item.id;
    dto.sacNumber = item.sacNumber;
    dto.caption = item.caption;
    dto.court = item.court;
    // Fechas civiles: se rinden como `YYYY-MM-DD` y no como instante
    // ISO completo. Son días, y serializarlas con hora invitaría a
    // leer una zona horaria que acá no significa nada.
    dto.startDate = toCivilDate(item.startDate);
    dto.client = item.client;
    dto.responsibleLawyer = item.responsibleLawyer;
    dto.currentState =
      item.currentState === null
        ? null
        : {
            proceduralStateId: item.currentState.proceduralStateId,
            name: item.currentState.name,
            custom: item.currentState.custom,
            dueDate:
              item.currentState.dueDate === null
                ? null
                : toCivilDate(item.currentState.dueDate),
          };
    dto.active = item.active;
    return dto;
  }
}

function toCivilDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
