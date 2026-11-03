/**
 * Se ejecuta antes de cada archivo de test de Vitest.
 *
 * Enciende MSW con los mismos handlers que usa la aplicación y deja todo como
 * nuevo después de cada test: los handlers pisados con `server.use`, la base
 * en memoria del mock, la caché de TanStack Query y el almacenamiento del
 * navegador. Así ningún test depende de lo que hizo el anterior.
 */

import '@testing-library/jest-dom/vitest'
import { File as NodeFile } from 'node:buffer'
import { createRequire } from 'node:module'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { configureMocks, server } from '@/shared/mocks/server'
import { resetMockDb } from '@/shared/mocks'
import { queryClient } from '@/shared/api/queryClient'

/*
 * Compatibilidad entre Vitest y jsdom para subir archivos (V4: modelos formales
 * y adjuntos de los actos).
 *
 * Cuando un pedido lleva un `File` o un `FormData`, Vitest 5.0 los convierte a
 * los de Node leyendo los bytes del Blob de jsdom por un atajo interno: busca
 * el primer símbolo propio del Blob y lee `blob[símbolo]._buffer`. jsdom 30
 * guarda esos datos en un campo privado y los llama `_bytes`, así que el
 * símbolo no existe, Vitest termina leyendo `blob["undefined"]._buffer` y el
 * pedido revienta antes de llegar a MSW ("Cannot read properties of undefined
 * (reading '_buffer')").
 *
 * Además, para un `FormData`, Vitest convierte cada archivo en un `Blob` de
 * Node y el archivo pierde el nombre: llega como "blob".
 *
 * Los dos parches de abajo le dan a Vitest lo que necesita con los datos que
 * jsdom expone en su API interna: un `Blob` suelto pasa por el atajo con sus
 * bytes, y los archivos de un `FormData` llegan ya convertidos en `File` de
 * Node, con su nombre y su tipo. Se pueden sacar cuando Vitest lo corrija.
 */
const jsdomUtils = createRequire(import.meta.url)('jsdom/lib/generated/idl/utils.js') as {
    implForWrapper: (wrapper: unknown) => { _bytes?: Uint8Array } | null
}
const bytesOf = (blob: Blob) => jsdomUtils.implForWrapper(blob)?._bytes ?? new Uint8Array()

const vitestImplKey = String(Object.getOwnPropertySymbols(Object.getOwnPropertyDescriptors(new Blob()))[0])
if (vitestImplKey === 'undefined' && !Object.hasOwn(Blob.prototype, vitestImplKey)) {
    Object.defineProperty(Blob.prototype, vitestImplKey, {
        get(this: Blob) {
            return { _buffer: bytesOf(this) }
        },
    })
}

const jsdomForEach = FormData.prototype.forEach
FormData.prototype.forEach = function forEach(callback, thisArg) {
    jsdomForEach.call(this, (value, key, parent) => {
        const converted =
            value instanceof File
                ? new NodeFile([bytesOf(value)], value.name, { type: value.type, lastModified: value.lastModified })
                : value
        callback.call(thisArg, converted as FormDataEntryValue, key, parent)
    })
}

/** Sin demora ni logs: en los tests sólo hacen más lento y más ruidoso todo. */
const TEST_MOCK_OPTIONS = {
    latencyMs: 0,
    // Un test que le pone demora a una ruta (`latencyProfile`) no se la pasa al siguiente.
    latencyProfile: null,
    log: false,
    forceFailure: null,
    passthrough: [],
} as const

beforeAll(() => {
    configureMocks({ ...TEST_MOCK_OPTIONS, passthrough: [] })
    /* 'error' y no 'bypass': un endpoint mal escrito tiene que hacer fallar
       el test, no intentar salir a la red. */
    server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
    cleanup()
    server.resetHandlers()
    resetMockDb()
    configureMocks({ ...TEST_MOCK_OPTIONS, passthrough: [] })
    queryClient.clear()
    localStorage.clear()
    // Los borradores de formularios (`shared/lib/drafts.ts`) no pasan de un test a otro.
    sessionStorage.clear()
})

afterAll(() => {
    server.close()
})
