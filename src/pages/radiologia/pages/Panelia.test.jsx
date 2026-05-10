import { fireEvent, render, screen } from "@testing-library/react";
import PanelIA from "./Panelia";

test("shows a clearer IA panel shell and empty state without an image", () => {
	const onClose = jest.fn();

	render(<PanelIA activo imageId={null} onClose={onClose} />);

	expect(screen.getByText("Asistente IA")).toBeInTheDocument();
	expect(screen.getAllByText("Sin imagen seleccionada").length).toBeGreaterThan(0);
	expect(screen.getByText(/Elige una serie del visor/i)).toBeInTheDocument();
	expect(screen.getByText("Grad-CAM")).toBeInTheDocument();
	expect(screen.getByText("Resumen")).toBeInTheDocument();

	fireEvent.click(screen.getByRole("button", { name: /Cerrar panel de IA/i }));

	expect(onClose).toHaveBeenCalledTimes(1);
});
