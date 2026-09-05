import { act, renderHook } from "@testing-library/react";
import { useNavegacionLista } from "./use-navegacion-lista";

const tecla = (key) => ({ key, preventDefault: jest.fn() });

describe("useNavegacionLista", () => {
	test("las flechas recorren la lista y dan la vuelta", () => {
		const { result } = renderHook(() =>
			useNavegacionLista({ cantidad: 3, onSeleccionar: jest.fn() }),
		);

		act(() => result.current.manejarTeclas(tecla("ArrowDown")));
		expect(result.current.indiceActivo).toBe(0);

		act(() => result.current.manejarTeclas(tecla("ArrowDown")));
		act(() => result.current.manejarTeclas(tecla("ArrowDown")));
		expect(result.current.indiceActivo).toBe(2);

		act(() => result.current.manejarTeclas(tecla("ArrowDown")));
		expect(result.current.indiceActivo).toBe(0);

		act(() => result.current.manejarTeclas(tecla("ArrowUp")));
		expect(result.current.indiceActivo).toBe(2);
	});

	test("Enter elige la opción marcada y no hace nada sin marca", () => {
		const onSeleccionar = jest.fn();
		const { result } = renderHook(() =>
			useNavegacionLista({ cantidad: 2, onSeleccionar }),
		);

		act(() => result.current.manejarTeclas(tecla("Enter")));
		expect(onSeleccionar).not.toHaveBeenCalled();

		act(() => result.current.manejarTeclas(tecla("ArrowDown")));
		act(() => result.current.manejarTeclas(tecla("Enter")));
		expect(onSeleccionar).toHaveBeenCalledWith(0);
	});

	test("Escape cierra la lista y quita la marca", () => {
		const onCerrar = jest.fn();
		const { result } = renderHook(() =>
			useNavegacionLista({ cantidad: 2, onSeleccionar: jest.fn(), onCerrar }),
		);

		act(() => result.current.manejarTeclas(tecla("ArrowDown")));
		act(() => result.current.manejarTeclas(tecla("Escape")));
		expect(onCerrar).toHaveBeenCalled();
		expect(result.current.indiceActivo).toBe(-1);
	});

	test("la opción marcada se distingue en el DOM", () => {
		const { result } = renderHook(() =>
			useNavegacionLista({ cantidad: 2, onSeleccionar: jest.fn() }),
		);

		act(() => result.current.manejarTeclas(tecla("ArrowDown")));
		expect(result.current.propsOpcion(0, "fila").className).toBe("fila resultado-activo");
		expect(result.current.propsOpcion(1, "fila").className).toBe("fila");
		expect(result.current.propsOpcion(0, "fila")["aria-selected"]).toBe(true);
	});

	test("con la lista cerrada las flechas no marcan nada", () => {
		const { result } = renderHook(() =>
			useNavegacionLista({ cantidad: 3, activo: false, onSeleccionar: jest.fn() }),
		);

		act(() => result.current.manejarTeclas(tecla("ArrowDown")));
		expect(result.current.indiceActivo).toBe(-1);
	});
});
