/**
 * Iniciales de un nombre, para los avatares.
 *
 * Vive en `shared/lib` porque la usan el avatar del rail y el de las tablas, y
 * antes cada uno tenía su copia. Toma las dos primeras palabras que empiezan
 * con letra: "GÓMEZ, Ariel Fernando" da `GA`, y una raya o un paréntesis
 * sueltos ("Pérez — (h)") no terminan en el avatar.
 */
export function initials(name: string): string {
    const words = name.split(/\s+/).filter(Boolean)
    const lettered = words.filter((w) => /^\p{L}/u.test(w))
    const source = lettered.length > 0 ? lettered : words

    return source
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
}
