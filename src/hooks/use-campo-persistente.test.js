import { act, renderHook } from "@testing-library/react";
import {
	hayBorradorPersistente,
	leerCampoPersistente,
	limpiarBorradorPersistente,
	useCampoPersistente,
	useModalPersistente,
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

	test("el valor por defecto no cuenta como captura", () => {
		renderHook(() => useCampoPersistente("paciente:pais", "México"));
		expect(hayBorradorPersistente("paciente:")).toBe(false);
	});

	test("no guarda nada cuando la persistencia está apagada", () => {
		const { result, unmount } = renderHook(() =>
			useCampoPersistente("paciente:nombre", "", { persistir: false }),
		);
		act(() => result.current[1]("Maria"));
		unmount();

		expect(hayBorradorPersistente("paciente:")).toBe(false);
		const { result: nuevo } = renderHook(() => useCampoPersistente("paciente:nombre"));
		expect(nuevo.current[0]).toBe("");
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

describe("useModalPersistente", () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	test("el modal abierto se reabre cuando el navegador descarta la página", () => {
		const { result } = renderHook(() => useModalPersistente("modal-paciente:abierto"));
		act(() => result.current[1](true));

		// Al descartar la página no corre ninguna limpieza de React: se monta de
		// nuevo con lo que quedó guardado.
		const { result: recuperado } = renderHook(() => useModalPersistente("modal-paciente:abierto"));
		expect(recuperado.current[0]).toBe(true);
	});

	test("al cerrarlo deja de reabrirse", () => {
		const { result } = renderHook(() => useModalPersistente("modal-paciente:abierto"));
		act(() => result.current[1](true));
		act(() => result.current[1](false));

		const { result: recuperado } = renderHook(() => useModalPersistente("modal-paciente:abierto"));
		expect(recuperado.current[0]).toBe(false);
	});

	test("salir de la pantalla con el modal abierto no deja la marca pegada", () => {
		const { result, unmount } = renderHook(() => useModalPersistente("modal-paciente:abierto"));
		act(() => result.current[1](true));

		// Al navegar dentro de la app React sí ejecuta la limpieza; cuando el
		// navegador descarta la página no corre nada y la marca sobrevive.
		unmount();

		expect(leerCampoPersistente("modal-paciente:abierto", false)).toBe(false);
	});

	test("no se reabre el modal de edición", () => {
		const { result } = renderHook(() =>
			useModalPersistente("modal-paciente:abierto", { persistir: false }),
		);
		act(() => result.current[1](true));

		const { result: recuperado } = renderHook(() => useModalPersistente("modal-paciente:abierto"));
		expect(recuperado.current[0]).toBe(false);
	});
});
