/** DI token for {@link CurrentDatePort}. */
export const CURRENT_DATE = Symbol('CURRENT_DATE');

/** Gives the civil date of the study (Córdoba), never the date of the server or the database. */
export interface CurrentDatePort {
  /** Today's date at midnight UTC, the way a `date` column is read and written. */
  today(): Date;
}
