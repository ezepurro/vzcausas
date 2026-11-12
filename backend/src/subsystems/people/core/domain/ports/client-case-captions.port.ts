/** A client's name as it heads a caption: last name and first names (HU10). */
export interface ClientNameRef {
  lastName: string;
  firstName: string;
}

/** What changed and who changed it, for the captions of the client's cases (CA-10.9). */
export interface ClientRenamed {
  clientId: number;
  previous: ClientNameRef;
  next: ClientNameRef;
  /** For the audit record of each case whose caption changes (CA-10.5). */
  actorUserId: number;
  occurredAt: Date;
}

/**
 * The captions that followed the rename, to announce once the transaction
 * committed. Opaque to `people`: only {@link ClientCaseCaptionsPort.announce}
 * reads it.
 */
export interface CaptionsFollowUp {
  readonly renamedCaseIds: readonly number[];
}

/**
 * What `people` needs from `cases` when a client changes name (D-121,
 * D-130): the captions of the client's cases that begin with the old name
 * follow it, and their Drive folders are renamed.
 *
 * Declared here, by the consumer (`puertos-acl.md`); `cases` implements it.
 * **Two steps, around the commit**, because `PATCH /clients` saves the
 * client, the captions and every audit record together, all or nothing:
 *
 * 1. {@link followRename} runs **inside** the client's transaction: it
 *    rewrites the captions and audits each case.
 * 2. {@link announce} runs **after** the commit: it asks for the folders to
 *    be renamed, so Drive never learns about a change that was rolled back.
 *    It never throws: a Drive problem does not undo the modification (CA-10.10).
 */
export interface ClientCaseCaptionsPort {
  followRename(renamed: ClientRenamed): Promise<CaptionsFollowUp>;

  announce(followUp: CaptionsFollowUp): Promise<void>;
}

export const ClientCaseCaptionsPort = Symbol("ClientCaseCaptionsPort");
