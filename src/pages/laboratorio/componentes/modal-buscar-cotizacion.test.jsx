import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ModalBuscarCotizacion from "./modal-buscar-cotizacion";
import { supabase } from "../../../lib/supabase-client";

jest.mock("../../../lib/supabase-client", () => ({
	supabase: {
		from: jest.fn(),
	},
}));

const renderModal = (props = {}) =>
	render(
		<ModalBuscarCotizacion
			isOpen
			onClose={jest.fn()}
			onSeleccionar={jest.fn()}
			onNotificar={jest.fn()}
			{...props}
		/>,
	);

describe("ModalBuscarCotizacion", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(window, "alert").mockImplementation(() => {});
	});

	afterEach(() => {
		window.alert.mockRestore();
	});

	test("notifica cuando no se ingresa número de cotización", () => {
		const onNotificar = jest.fn();
		renderModal({ onNotificar });

		fireEvent.click(screen.getByRole("button", { name: "Cargar Cotización" }));

		expect(onNotificar).toHaveBeenCalledWith(
			"Por favor ingrese el número de cotización",
			"advertencia",
		);
		expect(window.alert).not.toHaveBeenCalled();
	});

	test("notifica cuando no se encuentra la cotización", async () => {
		const onNotificar = jest.fn();
		supabase.from.mockReturnValue({
			select: () => ({
				eq: () => ({
					single: () => Promise.resolve({ data: null, error: new Error("not found") }),
				}),
			}),
		});

		renderModal({ onNotificar });
		fireEvent.change(screen.getByPlaceholderText("Ingresa el número de cotización..."), {
			target: { value: "123" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Cargar Cotización" }));

		await waitFor(() => {
			expect(onNotificar).toHaveBeenCalledWith(
				"No se encontró la cotización con ese número",
				"advertencia",
			);
		});
		expect(window.alert).not.toHaveBeenCalled();
	});
});
