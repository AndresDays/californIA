import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { useDuracionSugerida } from "./use-duracion-sugerida";

const RM = (descripcion) => ({ descripcion, modalidad: "resonancia" });
const TAC = (descripcion) => ({ descripcion, modalidad: "tomografia" });

const montar = (estudiosIniciales = []) =>
	renderHook(({ estudios }) => {
		const [duracion, setDuracion] = useState(30);
		const { sugerida, fijarBase } = useDuracionSugerida(estudios, duracion, setDuracion);
		return { duracion, setDuracion, sugerida, fijarBase };
	}, { initialProps: { estudios: estudiosIniciales } });

test("la duración sigue a los estudios: una hora por resonancia, media por lo demás", () => {
	const { result, rerender } = montar();
	expect(result.current.duracion).toBe(30);

	rerender({ estudios: [RM("craneo")] });
	expect(result.current.duracion).toBe(60);
	rerender({ estudios: [RM("craneo"), RM("rodilla"), RM("columna")] });
	expect(result.current.duracion).toBe(180);
	rerender({ estudios: [RM("craneo"), RM("rodilla"), RM("columna"), TAC("torax")] });
	expect(result.current.duracion).toBe(210);
});

test("si se cambió a mano ya no la mueve, pero sigue diciendo cuál tocaría", () => {
	const { result, rerender } = montar([RM("craneo")]);
	act(() => result.current.setDuracion(120));

	rerender({ estudios: [RM("craneo"), TAC("torax")] });
	expect(result.current.duracion).toBe(120);
	expect(result.current.sugerida).toBe(90);
});
