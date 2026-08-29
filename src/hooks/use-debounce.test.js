import { act, renderHook } from "@testing-library/react";
import { useDebounce } from "./use-debounce";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("devuelve el valor inicial sin esperar", () => {
	const { result } = renderHook(() => useDebounce("Rod", 300));
	expect(result.current).toBe("Rod");
});

test("no propaga el valor hasta que pasa el retraso", () => {
	const { result, rerender } = renderHook(({ valor }) => useDebounce(valor, 300), {
		initialProps: { valor: "" },
	});

	rerender({ valor: "Rodriguez" });
	expect(result.current).toBe("");

	act(() => jest.advanceTimersByTime(299));
	expect(result.current).toBe("");

	act(() => jest.advanceTimersByTime(1));
	expect(result.current).toBe("Rodriguez");
});

test("tecleo continuo produce una sola propagacion", () => {
	const { result, rerender } = renderHook(({ valor }) => useDebounce(valor, 300), {
		initialProps: { valor: "" },
	});

	for (const parcial of ["R", "Ro", "Rod", "Rodr", "Rodri"]) {
		rerender({ valor: parcial });
		act(() => jest.advanceTimersByTime(100));
	}

	// Nunca hubo 300 ms de silencio, así que el valor diferido sigue vacío.
	expect(result.current).toBe("");

	act(() => jest.advanceTimersByTime(300));
	expect(result.current).toBe("Rodri");
});

test("con retraso cero se sincroniza de inmediato", () => {
	const { result, rerender } = renderHook(({ valor }) => useDebounce(valor, 0), {
		initialProps: { valor: "" },
	});

	rerender({ valor: "Ana" });
	expect(result.current).toBe("Ana");
});
