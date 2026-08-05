import { act, renderHook } from "@testing-library/react";
import { useFechaPersistente } from "./use-fecha-persistente";

beforeEach(() => sessionStorage.clear());

test("restaura la fecha guardada para el filtro", () => {
	sessionStorage.setItem("california:filtro-fecha:captura:inicio", "2026-08-01");
	const { result } = renderHook(() => useFechaPersistente("captura:inicio", "2026-08-05"));
	expect(result.current[0]).toBe("2026-08-01");
});

test("guarda los cambios de fecha sin mezclar filtros", () => {
	const { result } = renderHook(() => useFechaPersistente("entrega-resultados:fin", "2026-08-05"));
	act(() => result.current[1]("2026-08-12"));

	expect(sessionStorage.getItem("california:filtro-fecha:entrega-resultados:fin")).toBe("2026-08-12");
	expect(sessionStorage.getItem("california:filtro-fecha:captura:fin")).toBeNull();
});
