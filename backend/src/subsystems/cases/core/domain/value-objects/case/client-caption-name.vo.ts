/**
 * The client's name as it heads a caption: `APELLIDO, Nombres`, the last name
 * in capitals — how the client proposes the caption when the case is
 * registered (contract V6 §3.7), e.g. `GÓMEZ, Ariel Fernando`.
 *
 * When a client changes name (HU10, D-121, D-130) only that beginning of the
 * caption is replaced; the rest stays as it was. The comparison does not tell
 * capitals from small letters (CA-10.9): `Gómez, Ariel Fernando c/ APROSS` also
 * begins with `GÓMEZ, Ariel Fernando`.
 *
 * A value object: no identity, nothing to validate — the client's subsystem
 * already checked the name.
 */
export class ClientCaptionName {
  private constructor(private readonly value: string) {}

  static of(lastName: string, firstName: string): ClientCaptionName {
    return new ClientCaptionName(`${lastName.trim().toLocaleUpperCase('es')}, ${firstName.trim()}`);
  }

  /** Whether the caption begins with this name, without telling capitals apart. */
  beginsAt(caption: string): boolean {
    return (
      caption.length >= this.value.length &&
      caption.slice(0, this.value.length).toLocaleLowerCase('es') === this.value.toLocaleLowerCase('es')
    );
  }

  /**
   * The caption with this name replaced by `next` at its beginning; the rest is
   * kept as it was. Only for a caption this name {@link beginsAt}.
   */
  replacedBy(next: ClientCaptionName, caption: string): string {
    return `${next.value}${caption.slice(this.value.length)}`;
  }

  equals(other: ClientCaptionName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
