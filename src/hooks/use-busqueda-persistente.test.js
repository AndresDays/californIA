import { act, renderHook } from "@testing-library/react";
import { useBusquedaPersistente } from "./use-busqueda-persistente";

beforeEach(() => sessionStorage.clear());

test("restaura la búsqueda guardada para su clave", () => {
	sessionStorage.setItem("california:busqueda:precios:termino", "resonancia");
	const { result } = renderHook(() => useBusquedaPersistente("precios:termino"));
	expect(result.current[0]).toBe("resonancia");
});

test("guarda cambios y elimina una búsqueda vacía", () => {
	const { result } = renderHook(() => useBusquedaPersistente("precios:termino"));
	act(() => result.current[1]("rei"));
	expect(sessionStorage.getItem("california:busqueda:precios:termino")).toBe("rei");
	act(() => result.current[1](""));
	expect(sessionStorage.getItem("california:busqueda:precios:termino")).toBeNull();
});

test("aísla los campos de páginas distintas", () => {
	sessionStorage.setItem("california:busqueda:precios:termino", "tac");
	const { result } = renderHook(() => useBusquedaPersistente("pacientes:termino"));
	expect(result.current[0]).toBe("");
});
