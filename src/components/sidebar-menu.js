import configuracionIcono from "../assets/configuracionIcono.png";
import entregaIcono from "../assets/entregaIcono.png";
import imprimirIcono from "../assets/imprimirIcono.png";
import inicioIcono from "../assets/inicioIcono.png";
import nuevoPacienteIcono from "../assets/nuevoPacienteIcono.png";
import pacientesIcono from "../assets/pacientesIcono.png";
import recepcionIcono from "../assets/recepcionIcono.png";
import ventasIcono from "../assets/ventasIcono.png";

const subIcon = "○";

export const sidebarItems = [
	{
		id: "inicio",
		label: "Inicio",
		icon: inicioIcono,
		path: "/dashboard",
	},
	{
		id: "nuevo-paciente",
		label: "Nuevo Paciente",
		icon: nuevoPacienteIcono,
		path: "/nuevo-paciente",
	},
	{
		id: "captura",
		label: "Captura",
		icon: imprimirIcono,
		path: "/captura",
	},
	{
		id: "entrega",
		label: "Entrega",
		icon: entregaIcono,
		path: "/entrega-resultados",
	},
	{
		id: "recepcion",
		label: "Recepción",
		icon: recepcionIcono,
		path: "/dashboard",
		hasSubmenu: true,
		submenu: [
			{
				id: "editar-solicitud",
				label: "Editar Solicitud",
				icon: subIcon,
				path: "/editar-solicitud",
			},
			{ id: "cotizacion", label: "Cotización", icon: subIcon, path: "/cotizacion" },
			{ id: "historial", label: "Historial", icon: subIcon, path: "/historial" },
			{ id: "cierre-caja", label: "Cierre Caja", icon: subIcon, path: "/cierre-caja" },
		],
	},
	{
		id: "administracion",
		label: "Administración",
		icon: pacientesIcono,
		path: "/pacientes",
		hasSubmenu: true,
		submenu: [
			{ id: "pacientes", label: "Pacientes", icon: subIcon, path: "/pacientes" },
			{ id: "doctores", label: "Doctores", icon: subIcon, path: "/doctores" },
			{ id: "usuarios", label: "Usuarios", icon: subIcon, path: "/usuarios" },
		],
	},
	{
		id: "reportes",
		label: "Reportes",
		icon: ventasIcono,
		path: "/reporte-ventas",
		hasSubmenu: true,
		submenu: [
			{
				id: "reporte-ventas",
				label: "Ventas",
				icon: subIcon,
				path: "/reporte-ventas",
			},
			{
				id: "reporte-administrativo",
				label: "Administrativo",
				icon: subIcon,
				path: "/reporte-administrativo",
			},
		],
	},
	{
		id: "configuracion",
		label: "Configuración",
		icon: configuracionIcono,
		path: "/configuracion",
		hasSubmenu: true,
		submenu: [
			{ id: "estudios", label: "Estudios", icon: subIcon, path: "/configuracion/estudios" },
			{ id: "analitos", label: "Analitos", icon: subIcon, path: "/configuracion/analitos" },
			{ id: "paquetes", label: "Paquetes", icon: subIcon, path: "/configuracion/paquetes" },
			{ id: "precios", label: "Precios", icon: subIcon, path: "/configuracion/precios" },
			{ id: "areas", label: "Áreas", icon: subIcon, path: "/configuracion/areas" },
			{
				id: "tipo-muestra",
				label: "Tipo de Muestra",
				icon: subIcon,
				path: "/configuracion/tipo-muestra",
			},
			{ id: "equipos", label: "Equipos", icon: subIcon, path: "/configuracion/equipos" },
			{ id: "metodo", label: "Métodos", icon: subIcon, path: "/configuracion/metodo" },
			{ id: "tecnica", label: "Técnicas", icon: subIcon, path: "/configuracion/tecnica" },
			{
				id: "recipientes",
				label: "Recipientes",
				icon: subIcon,
				path: "/configuracion/recipientes",
			},
			{
				id: "nivel-mar",
				label: "Nivel del Mar",
				icon: subIcon,
				path: "/configuracion/nivel",
			},
		],
	},
];
