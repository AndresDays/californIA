import { act, renderHook } from "@testing-library/react";
import {
	hayBorradorPersistente,
	leerCampoPersistente,
	limpiarBorradorPersistente,
	useCampoPersistente,
} from "./use-campo-persistente";

describe("useCampoPersistente", () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	test("guarda el valor capturado y lo recupera al volver a montar", () => {
		const { result, unmount } = renderHook(() => useCampoPersistente("paciente:nombre"));
		act(() => result.current[1]("Maria Rosalia"));
		unmount();

		const { result: recuperado } = renderHook(() => useCampoPersistente("paciente:nombre"));
		expect(recuperado.current[0]).toBe("Maria Rosalia");
	});

	test("respeta el valor inicial mientras no se capture nada", () => {
		const { result } = renderHook(() => useCampoPersistente("paciente:pais", "México"));
		expect(result.current[0]).toBe("México");
	});

	test("conserva valores que no son texto", () => {
		const { result, unmount } = renderHook(() => useCampoPersistente("paciente:doctor", null));
		act(() => result.current[1]({ id_doctor: 7, nombre: "Odile" }));
		unmount();

		expect(leerCampoPersistente("paciente:doctor", null)).toEqual({ id_doctor: 7, nombre: "Odile" });
	});

	test("olvida el campo cuando se vacía", () => {
		const { result } = renderHook(() => useCampoPersistente("paciente:edad"));
		act(() => result.current[1]("42"));
		expect(hayBorradorPersistente("paciente:")).toBe(true);

		act(() => result.current[1](""));
		expect(hayBorradorPersistente("paciente:")).toBe(false);
	});

	test("limpiar borra sólo las claves del formulario indicado", () => {
		const { result: nombre } = renderHook(() => useCampoPersistente("paciente:nombre"));
		const { result: otro } = renderHook(() => useCampoPersistente("doctor:nombre"));
		act(() => nombre.current[1]("Maria"));
		act(() => otro.current[1]("Odile"));

		limpiarBorradorPersistente("paciente:");

		expect(hayBorradorPersistente("paciente:")).toBe(false);
		expect(leerCampoPersistente("doctor:nombre")).toBe("Odile");
	});
});
