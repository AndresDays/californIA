import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import californIA from "../assets/CalifornIA.png";
import { useAuth } from "../context/auth-context";
import { guardarRolCacheado, obtenerRolCacheado } from "../utils/role-cache";
import { esRadiologoClinicoPermisos, filtrarMenuPorRol } from "../utils/role-permissions";
import { sidebarItems } from "./sidebar-menu";
import "./sidebar.css";

// En el build de producción Vite incrusta los PNG pequeños (<4 KB) como
// `data:image/png;base64,...`, así que no basta con buscar ".png" en la ruta:
// el icono se pintaba como texto base64 en el menú del celular.
const esRutaImagen = (icono) =>
	typeof icono === "string" &&
	(icono.startsWith("data:image/") || /\.(png|jpe?g|svg|webp|gif)(\?.*)?$/i.test(icono));

const Sidebar = ({ isOpen, setIsOpen, empleadoData: empleadoDataProp }) => {
	const navigate = useNavigate();
	const location = useLocation();
	const { empleadoData, user } = useAuth();
	const [expandedMenus, setExpandedMenus] = useState({});
	const rolEmpleado = empleadoDataProp?.rol || empleadoData?.rol;
	const rolSidebar = rolEmpleado || obtenerRolCacheado(user?.id);
	const menuItems = user && !rolSidebar ? [] : filtrarMenuPorRol(sidebarItems, rolSidebar);

	const toggleSubmenu = (itemId) =>
		setExpandedMenus((prev) => ({ ...prev, [itemId]: !prev[itemId] }));

	const handleNavigate = (path) => {
		navigate(path);
		if (window.innerWidth <= 968) setIsOpen(false);
	};

	const isActive = (path) => location.pathname === path;
	const isSubmenuActive = (submenu) =>
		submenu?.some((item) => location.pathname.startsWith(item.path));
	// Un grupo con submenú sólo se marca por sus hijos: "Recepción" comparte
	// la ruta /dashboard con "Inicio" y aparecía activo al entrar a la app.
	const isItemActive = (item) =>
		item.hasSubmenu ? isSubmenuActive(item.submenu) : isActive(item.path);

	useEffect(() => {
		setExpandedMenus({});
	}, [location.pathname]);

	useEffect(() => {
		guardarRolCacheado(user?.id, rolEmpleado);
	}, [rolEmpleado, user?.id]);

	if (esRadiologoClinicoPermisos(rolSidebar)) return null;

	return (
		<>
			{isOpen && (
				<div className="sidebar-overlay" onClick={() => setIsOpen(false)} />
			)}

			<aside className={`sidebar ${isOpen ? "open" : ""}`}>
				<div className="sidebar-header">
					<img src={californIA} alt="CalifornIA" className="sidebar-logo" />
				</div>
				<nav className="sidebar-nav">
					{menuItems.map((item) => (
						<div key={item.id} className="sidebar-item-wrapper">
							<button
								className={`sidebar-item ${isItemActive(item) ? "active" : ""}`}
								onClick={() => {
									if (item.hasSubmenu) toggleSubmenu(item.id);
									else handleNavigate(item.path);
								}}>
								<span className="sidebar-icon">
									{esRutaImagen(item.icon) ? (
										<img
											src={item.icon}
											alt=""
											className="sidebar-icon-img"
										/>
									) : (
										item.icon
									)}
								</span>
								<span className="sidebar-label">{item.label}</span>
								{item.hasSubmenu && (
									<span
										className={`submenu-arrow ${expandedMenus[item.id] ? "expanded" : ""}`}>
										▼
									</span>
								)}
							</button>
							{item.hasSubmenu && expandedMenus[item.id] && (
								<div
									className={`sidebar-submenu ${item.id === "configuracion" ? "grid-2-cols" : ""}`}>
									{item.submenu.map((subItem) => (
										<button
											key={subItem.id}
											className={`sidebar-subitem ${isActive(subItem.path) ? "active" : ""}`}
											onClick={(e) => {
												e.stopPropagation();
												handleNavigate(subItem.path);
											}}>
											<span className="sidebar-subicon">{subItem.icon}</span>
											<span className="sidebar-sublabel">{subItem.label}</span>
										</button>
									))}
								</div>
							)}
						</div>
					))}
				</nav>
				<div className="sidebar-footer">
					<p className="sidebar-version">CalifornIA v1.0</p>
					<p className="sidebar-copyright">© 2024</p>
				</div>
			</aside>
		</>
	);
};

export default Sidebar;
