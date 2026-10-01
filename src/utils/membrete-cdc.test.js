import JSZip from "jszip";
import { resolverMembretePlantilla } from "./membrete-cdc";

jest.mock("../assets/CDC Plantilla.docx?url", () => "mock-cdc-plantilla.docx", { virtual: true });
jest.mock("../pages/radiologia/pages/reporte-radiologia-template", () => ({ MEMBRETE_B64: "CDC" }));

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

describe("resolverMembretePlantilla", () => {
	afterEach(() => {
		delete global.fetch;
	});

	test("usa el membrete guardado en base64", async () => {
		await expect(
			resolverMembretePlantilla({ membrete_base64: "data:image/png;base64,ODILE", archivo_url: "x.docx" }),
		).resolves.toBe("data:image/png;base64,ODILE");
	});

	test("usa la URL cuando la plantilla es una imagen", async () => {
		await expect(
			resolverMembretePlantilla({ archivo_url: "https://x/odile.png", mime_type: "image/png" }),
		).resolves.toBe("https://x/odile.png");
	});

	test("extrae el membrete de un .docx sin base64 guardado", async () => {
		const zip = new JSZip();
		zip.file("word/media/image1.png", "ODILE");
		const contenido = await zip.generateAsync({ type: "arraybuffer" });
		global.fetch = jest.fn(() => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(contenido) }));

		await expect(
			resolverMembretePlantilla({ archivo_url: "https://x/odile.docx", mime_type: DOCX, membrete_base64: null }),
		).resolves.toBe(`data:image/png;base64,${Buffer.from("ODILE").toString("base64")}`);
	});

	test("devuelve null si la plantilla no trae imagen utilizable", async () => {
		await expect(
			resolverMembretePlantilla({ archivo_url: "https://x/odile.pdf", mime_type: "application/pdf" }),
		).resolves.toBeNull();
		await expect(resolverMembretePlantilla(null)).resolves.toBeNull();
	});
});
