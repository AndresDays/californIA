import { act, fireEvent, render, screen } from "@testing-library/react";
import PromocionesSala from "./promociones-sala";

jest.mock("../../components/page-layout.jsx", () => ({ children }) => <div>{children}</div>);
jest.mock("../../hooks/use-empleado-actual", () => ({
	useEmpleadoActual: () => ({ empleadoData: {}, formatRol: () => "", getPrimerNombre: () => "" }),
}));

let mockFilas = [];
const mockUpdate = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockUpload = jest.fn();
const mockRemove = jest.fn();

jest.mock("../../lib/supabase-client", () => {
	const consulta = () => {
		const cadena = {
			select: () => cadena,
			order: () => cadena,
			then: (resolver) => Promise.resolve({ data: mockFilas, error: null }).then(resolver),
		};
		return cadena;
	};
	return {
		supabase: {
			from: () => ({
				...consulta(),
				update: (cambios) => ({
					eq: (_campo, id) => {
						mockUpdate(cambios, id);
						return Promise.resolve({ error: null });
					},
				}),
				insert: (filas) => {
					mockInsert(filas);
					mockFilas = [...mockFilas, { id_promocion: 99, activa: true, ...filas[0] }];
					return Promise.resolve({ error: null });
				},
				delete: () => ({
					eq: (_campo, id) => {
						mockDelete(id);
						mockFilas = mockFilas.filter((fila) => fila.id_promocion !== id);
						return Promise.resolve({ error: null });
					},
				}),
			}),
			storage: {
				from: () => ({
					getPublicUrl: (ruta) => ({ data: { publicUrl: `https://cdn.test/${ruta}` } }),
					upload: (...args) => {
						mockUpload(...args);
						return Promise.resolve({ error: null });
					},
					remove: (rutas) => {
						mockRemove(rutas);
						return Promise.resolve({ error: null });
					},
				}),
			},
		},
	};
});

const filas = [
	{ id_promocion: 1, titulo: "Mes del hombre", storage_path: "hombre.png", orden: 1, activa: true },
	{ id_promocion: 2, titulo: "Noviembre rosa", storage_path: "rosa.png", orden: 2, activa: false },
];

const montar = async () => {
	await act(async () => {
		render(<PromocionesSala />);
	});
};

beforeEach(() => {
	jest.clearAllMocks();
	mockFilas = filas;
});

test("lista las promociones con su estado", async () => {
	await montar();

	expect(screen.getByAltText("Mes del hombre")).toHaveAttribute("src", "https://cdn.test/hombre.png");
	expect(screen.getByText("Se muestra")).toBeInTheDocument();
	expect(screen.getByText("Desactivada")).toBeInTheDocument();
	expect(screen.getByText("1 de 2 se muestran hoy en la pantalla.")).toBeInTheDocument();
});

test("subir una imagen la guarda en storage y la da de alta al final", async () => {
	await montar();
	const archivo = new File(["x"], "Promo Diciembre.png", { type: "image/png" });

	await act(async () => {
		fireEvent.change(screen.getByLabelText("Subir imágenes de promociones"), { target: { files: [archivo] } });
	});

	expect(mockUpload).toHaveBeenCalledWith(expect.stringMatching(/promo-diciembre\.png$/), archivo, expect.any(Object));
	expect(mockInsert).toHaveBeenCalledWith([
		expect.objectContaining({ titulo: "Promo Diciembre", orden: 3, activa: true }),
	]);
	expect(screen.getByText("Promoción agregada.")).toBeInTheDocument();
});

test("rechaza archivos que no son imagen", async () => {
	await montar();
	const archivo = new File(["x"], "lista.pdf", { type: "application/pdf" });

	await act(async () => {
		fireEvent.change(screen.getByLabelText("Subir imágenes de promociones"), { target: { files: [archivo] } });
	});

	expect(mockUpload).not.toHaveBeenCalled();
	expect(screen.getByRole("alert")).toHaveTextContent(/no son PNG, JPG o WEBP/);
});

test("activar, poner vigencia y reordenar se guarda", async () => {
	await montar();
	const [, segunda] = screen.getAllByRole("checkbox");

	await act(async () => {
		fireEvent.click(segunda);
	});
	expect(mockUpdate).toHaveBeenCalledWith({ activa: true }, 2);

	await act(async () => {
		fireEvent.change(screen.getAllByLabelText("Hasta")[0], { target: { value: "2026-11-30" } });
	});
	expect(mockUpdate).toHaveBeenCalledWith({ vigente_hasta: "2026-11-30" }, 1);

	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Subir Noviembre rosa" }));
	});
	expect(mockUpdate).toHaveBeenCalledWith({ orden: 1 }, 2);
	expect(mockUpdate).toHaveBeenCalledWith({ orden: 2 }, 1);
});

test("eliminar pide confirmación y borra también la imagen", async () => {
	await montar();

	fireEvent.click(screen.getAllByRole("button", { name: "Eliminar" })[0]);
	expect(mockDelete).not.toHaveBeenCalled();
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
	});

	expect(mockDelete).toHaveBeenCalledWith(1);
	expect(mockRemove).toHaveBeenCalledWith(["hombre.png"]);
});
