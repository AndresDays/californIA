import { diasDelMes } from "./dias-del-mes";

test("cada mes trae los días que le tocan", () => {
	expect(diasDelMes("1980", "01")).toBe(31);
	expect(diasDelMes("1980", "04")).toBe(30);
});

// Sin esto se podía capturar un 30 de febrero eligiendo primero el día.
test("febrero cambia con el año bisiesto", () => {
	expect(diasDelMes("1980", "02")).toBe(29);
	expect(diasDelMes("1981", "02")).toBe(28);
	expect(diasDelMes("1900", "02")).toBe(28);
	expect(diasDelMes("2000", "02")).toBe(29);
});

test("sin mes elegido se ofrecen los 31", () => {
	expect(diasDelMes("1980", "")).toBe(31);
	expect(diasDelMes("", "")).toBe(31);
});
