import {
	crearCadenaFirmaTwilio,
	validarFirmaTwilio,
} from "../../supabase/functions/_shared/twilio-signature.js";
import { TextEncoder } from "util";
import { webcrypto } from "crypto";

global.TextEncoder = TextEncoder;
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });

const url = "https://example.com/myapp.php?foo=1&bar=2";
const params = new URLSearchParams({
	Digits: "1234",
	To: "+18005551212",
	From: "+14158675310",
	Caller: "+14158675310",
	CallSid: "CA1234567890ABCDE",
});

describe("validarFirmaTwilio", () => {
	test("construye y valida la firma HMAC de Twilio", async () => {
		expect(crearCadenaFirmaTwilio(url, params)).toBe(
			"https://example.com/myapp.php?foo=1&bar=2CallSidCA1234567890ABCDECaller+14158675310Digits1234From+14158675310To+18005551212",
		);

		await expect(
			validarFirmaTwilio("12345", "L/OH5YylLD5NRKLltdqwSvS0BnU=", url, params),
		).resolves.toBe(true);
	});

	test("rechaza una firma distinta", async () => {
		await expect(
			validarFirmaTwilio("12345", "firma-invalida", url, params),
		).resolves.toBe(false);
	});
});
