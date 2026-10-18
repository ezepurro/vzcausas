export interface GetQualificationsInput {
  search?: string;
  page: number;
  limit: number;
}

export interface QualificationFilter {
  /**
   * Free text matched against `name`, which carries the article, so
   * one field serves both halves of CA-47.4 ("hurto" and "art. 162").
   */
  search?: string;
}
