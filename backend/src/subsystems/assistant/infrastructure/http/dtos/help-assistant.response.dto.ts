/** A section of the manual the answer relies on (proposal §2, `sources[]`). */
export class HelpAssistantSourceDto {
  id!: string;
  title!: string;
}

/** `data` of `POST /help/assistant` (proposal §2, "Respuesta exitosa"). */
export class HelpAssistantResponseDto {
  answer!: string;
  sources!: HelpAssistantSourceDto[];
}
