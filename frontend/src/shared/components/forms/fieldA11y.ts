/**
 * Lo que une un campo con su error, su nota y su obligatoriedad para un lector
 * de pantalla (H-35), en los formularios que arman sus campos a mano con
 * `Field` (`CaseForm`, `CaseEditForm`, `ProceduralActForm`). `FormModal` hace
 * lo mismo por su cuenta, con los mismos ids.
 *
 * `Field` no dibuja el control —llega en `children`—, así que cada punta
 * recibe su parte:
 *
 *     <Field label="Carátula" required htmlFor="case-caption" error={errors.caption}
 *         {...fieldIds('case-caption')}>
 *         <TextInput
 *             id="case-caption"
 *             {...controlA11y('case-caption', errors.caption, { required: true })}
 *         />
 *     </Field>
 */

/** Para `Field`: los ids del mensaje de error y de la nota. */
export function fieldIds(id: string): { errorId: string; noteId: string } {
    return { errorId: `${id}-error`, noteId: `${id}-note` }
}

export interface ControlA11yOptions {
    /** El campo tiene una nota de ayuda: se lee cuando no hay error. */
    note?: boolean
    /** El campo es obligatorio: lo anuncia el control, no el asterisco. */
    required?: boolean
}

export interface ControlA11y {
    'aria-invalid': true | undefined
    'aria-describedby': string | undefined
    'aria-required': true | undefined
}

/**
 * Para el control: con error, lo marca inválido y lo describe con el mensaje;
 * sin error, con la nota si la hay (`Field` dibuja una o la otra, nunca las
 * dos).
 */
export function controlA11y(
    id: string,
    error: string | undefined,
    { note = false, required = false }: ControlA11yOptions = {},
): ControlA11y {
    const ids = fieldIds(id)

    return {
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? ids.errorId : note ? ids.noteId : undefined,
        'aria-required': required ? true : undefined,
    }
}
