import JSZip from "jszip";
import { convertirDocxAHtml } from "./docx-a-html";

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

const crearDocx = async ({ cuerpo, estilos, numeracion }) => {
	const zip = new JSZip();
	zip.file("word/document.xml", `<?xml version="1.0"?><w:document ${NS}><w:body>${cuerpo}</w:body></w:document>`);
	if (estilos) zip.file("word/styles.xml", `<?xml version="1.0"?><w:styles ${NS}>${estilos}</w:styles>`);
	if (numeracion) zip.file("word/numbering.xml", `<?xml version="1.0"?><w:numbering ${NS}>${numeracion}</w:numbering>`);
	return zip.generateAsync({ type: "arraybuffer" });
};

const aDom = (html) => {
	const contenedor = document.createElement("div");
	contenedor.innerHTML = html;
	return contenedor;
};

describe("convertirDocxAHtml", () => {
	test("conserva el formato de los runs y la alineación del párrafo", async () => {
		const html = await convertirDocxAHtml(await crearDocx({
			cuerpo: `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>
				<w:r><w:rPr><w:b/><w:rFonts w:ascii="Arial"/><w:sz w:val="28"/><w:color w:val="C00000"/></w:rPr><w:t>CONCLUSIÓN</w:t></w:r>
				<w:r><w:rPr><w:i/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve"> normal</w:t></w:r></w:p>`,
		}));
		const p = aDom(html).querySelector("p");
		expect(p.style.textAlign).toBe("center");
		expect(p.style.margin).toBe("0pt 0pt 12pt 0pt");
		const [titulo, resto] = p.querySelectorAll("span");
		expect(titulo.textContent).toBe("CONCLUSIÓN");
		expect(titulo.style.fontWeight).toBe("bold");
		expect(titulo.style.fontFamily).toContain("Arial");
		expect(titulo.style.fontSize).toBe("14pt");
		expect(titulo.style.color).toBe("rgb(192, 0, 0)");
		expect(resto.textContent).toBe(" normal");
		expect(resto.style.fontStyle).toBe("italic");
		expect(resto.style.textDecoration).toBe("underline");
	});

	test("aplica los estilos del documento heredados con basedOn", async () => {
		const html = await convertirDocxAHtml(await crearDocx({
			estilos: `<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
				<w:style w:type="paragraph" w:styleId="Base"><w:rPr><w:rFonts w:ascii="Calibri"/></w:rPr></w:style>
				<w:style w:type="paragraph" w:styleId="Titulo"><w:basedOn w:val="Base"/><w:rPr><w:b/></w:rPr></w:style>`,
			cuerpo: '<w:p><w:pPr><w:pStyle w:val="Titulo"/></w:pPr><w:r><w:t>Hallazgos</w:t></w:r></w:p>',
		}));
		const span = aDom(html).querySelector("span");
		expect(span.style.fontFamily).toContain("Calibri");
		expect(span.style.fontWeight).toBe("bold");
		expect(span.style.fontSize).toBe("11pt");
	});

	test("numera las listas y usa viñetas legibles", async () => {
		const numeracion = `<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
			<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val=""/></w:lvl></w:abstractNum>
			<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>`;
		const item = (numId, texto) => `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr></w:pPr><w:r><w:t>${texto}</w:t></w:r></w:p>`;
		const html = await convertirDocxAHtml(await crearDocx({
			numeracion,
			cuerpo: item(1, "Uno") + item(1, "Dos") + item(2, "Viñeta"),
		}));
		const parrafos = aDom(html).querySelectorAll("p");
		expect(parrafos[0].textContent).toBe("1.Uno");
		expect(parrafos[1].textContent).toBe("2.Dos");
		expect(parrafos[1].style.marginLeft).toBe("36pt");
		expect(parrafos[1].style.textIndent).toBe("-18pt");
		expect(parrafos[2].textContent).toBe("•Viñeta");
	});

	test("convierte tablas con bordes y celdas combinadas", async () => {
		const html = await convertirDocxAHtml(await crearDocx({
			cuerpo: `<w:tbl><w:tblPr><w:tblBorders><w:insideH w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>
				<w:tr><w:tc><w:tcPr><w:gridSpan w:val="2"/></w:tcPr><w:p><w:r><w:t>Medidas</w:t></w:r></w:p></w:tc></w:tr>
				<w:tr><w:tc><w:p><w:r><w:t>Hígado</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>14 cm</w:t></w:r></w:p></w:tc></w:tr></w:tbl>`,
		}));
		const tabla = aDom(html).querySelector("table");
		expect(tabla.querySelectorAll("tr")).toHaveLength(2);
		expect(tabla.querySelector("td").getAttribute("colspan")).toBe("2");
		expect(tabla.querySelectorAll("td")[2].textContent).toBe("14 cm");
		expect(tabla.querySelector("td").style.borderTop).toContain("solid");
	});

	test("rechaza archivos que no son Word", async () => {
		const zip = new JSZip();
		zip.file("otro.txt", "hola");
		await expect(convertirDocxAHtml(await zip.generateAsync({ type: "arraybuffer" }))).rejects.toThrow(/Word/);
	});
});
