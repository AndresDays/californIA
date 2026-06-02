import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export const exportarExcel = (columnas, filas, nombreArchivo) => {
	const ws = XLSX.utils.aoa_to_sheet([columnas, ...filas]);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, "Datos");

	const colWidths = columnas.map((col, i) => ({
		wch: Math.max(col.length, ...filas.map((f) => String(f[i] ?? "").length)) + 2,
	}));
	ws["!cols"] = colWidths;

	XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
};

export const exportarPDF = (titulo, columnas, filas, nombreArchivo) => {
	const doc = new jsPDF({ orientation: filas.length > 0 && columnas.length > 5 ? "landscape" : "portrait" });

	doc.setFontSize(14);
	doc.setTextColor(10, 25, 41);
	doc.text(titulo, 14, 16);

	doc.setFontSize(9);
	doc.setTextColor(120, 120, 120);
	doc.text(`Generado: ${new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}`, 14, 22);

	autoTable(doc, {
		head: [columnas],
		body: filas,
		startY: 27,
		styles: { fontSize: 8, cellPadding: 2 },
		headStyles: { fillColor: [16, 109, 160], textColor: 255, fontStyle: "bold" },
		alternateRowStyles: { fillColor: [240, 247, 252] },
		margin: { left: 14, right: 14 },
	});

	doc.save(`${nombreArchivo}.pdf`);
};
