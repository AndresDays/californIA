import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import californiaLogo from "../assets/CalifornIA.png";
import NotificationBell from "./notification-bell";
import { esRadiologoClinicoPermisos } from "../utils/role-permissions";
import { puedePublicarPlantillasRadiologia } from "../utils/plantillas-radiologia-permisos";
import "./header.css";

const DropdownPortal = ({ anchorRef, onClose, children }) => {
	const [pos, setPos] = useState({ top: 0, right: 0 });

	useEffect(() => {
		if (!anchorRef.current) return;
		const rect = anchorRef.current.getBoundingClientRect();
		setPos({ top: rect.bottom + 10, right: window.innerWidth - rect.right });
	}, [anchorRef]);

	useEffect(() => {
		const handler = (e) => {
			const dropdown = document.querySelector(".user-dropdown-menu");
			const anchor = anchorRef.current;
			if (
				anchor &&
				!anchor.contains(e.target) &&
				dropdown &&
				!dropdown.contains(e.target)
			) {
				onClose();
			}
		};
		setTimeout(() => document.addEventListener("click", handler), 0);
		return () => document.removeEventListener("click", handler);
	}, [anchorRef, onClose]);

	return createPortal(
		<div
			className="user-dropdown-menu"
			style={{
				position: "fixed",
				top: pos.top,
				right: pos.right,
				background: "#061a2e",
				isolation: "isolate",
			}}
			onMouseDown={(e) => e.stopPropagation()}>
			{children}
		</div>,
		document.body,
	);
};

const Header = ({
	menuOpen,
	setMenuOpen,
	menuRef,
	empleadoData,
	formatRol,
	getPrimerNombre,
	user,
	handleLogout,
	sidebarOpen,
	setSidebarOpen,
	currentPage = "inicio",
}) => {
	const navigate = useNavigate();
	const avatarRef = useRef(null);
	const rolNormalizado = (empleadoData?.rol || "")
		.toString()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
	const puedeVerPlantillas = puedePublicarPlantillasRadiologia(rolNormalizado);
	const ocultarNavegacion = esRadiologoClinicoPermisos(empleadoData?.rol);

	const getIniciales = () => {
		const nombre = empleadoData?.nombre || user?.email || "";
		const partes = nombre.trim().split(/\s+/).filter(Boolean);
		if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
		if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
		return "U";
	};

	const nombreCompleto = empleadoData?.nombre || user?.email || "Usuario";
	const rol = empleadoData ? formatRol(empleadoData.rol) : "";

	return (
		<header className="dashboard-header">
			{/* ── Izquierda: hamburguesa + campana ── */}
			<div className="header-left">
				{!ocultarNavegacion && <button
					className={`hamburger-btn${sidebarOpen ? " active" : ""}`}
					onClick={() => setSidebarOpen?.((v) => !v)}
					aria-label="Abrir menú">
					<span />
					<span />
					<span />
				</button>}
				<NotificationBell user={user} navigate={navigate} />
			</div>

			<div className="header-center-logo" aria-hidden="true">
				<img src={californiaLogo} alt="" className="header-california-logo" />
			</div>

			{/* ── Derecha: avatar ── */}
			<div className="header-right" ref={menuRef}>
				<button
					ref={avatarRef}
					className={`user-avatar-btn${menuOpen ? " open" : ""}`}
					onClick={() => setMenuOpen((v) => !v)}
					aria-label="Menú de usuario">
					<span className="user-avatar-initials">{getIniciales()}</span>
				</button>
			</div>

			{menuOpen && (
				<DropdownPortal anchorRef={avatarRef} onClose={() => setMenuOpen(false)}>
					<div className="dropdown-header">
						<div className="dropdown-avatar-large">
							<span>{getIniciales()}</span>
						</div>
						<div className="dropdown-user-info">
							<span className="dropdown-user-name">{nombreCompleto}</span>
							<span className="dropdown-user-rol">{rol}</span>
						</div>
					</div>
					<div className="dropdown-body">
						<button
							className="menu-item"
							onClick={() => {
								setMenuOpen(false);
								navigate("/perfil");
							}}>
							<span className="menu-item-icon">
								<svg viewBox="0 0 20 20" fill="none">
									<circle
										cx="10"
										cy="7"
										r="3.5"
										stroke="currentColor"
										strokeWidth="1.5"
									/>
									<path
										d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
									/>
								</svg>
							</span>
							Perfil
						</button>
						<button className="menu-item">
							<span className="menu-item-icon">
								<svg viewBox="0 0 20 20" fill="none">
									<rect
										x="3"
										y="3"
										width="6"
										height="6"
										rx="1.5"
										stroke="currentColor"
										strokeWidth="1.5"
									/>
									<rect
										x="11"
										y="3"
										width="6"
										height="6"
										rx="1.5"
										stroke="currentColor"
										strokeWidth="1.5"
									/>
									<rect
										x="3"
										y="11"
										width="6"
										height="6"
										rx="1.5"
										stroke="currentColor"
										strokeWidth="1.5"
									/>
									<rect
										x="11"
										y="11"
										width="6"
										height="6"
										rx="1.5"
										stroke="currentColor"
										strokeWidth="1.5"
									/>
								</svg>
							</span>
							Accesos
						</button>
						{puedeVerPlantillas && (
							<button
								className="menu-item"
								onClick={() => {
									setMenuOpen(false);
									navigate("/plantillas");
								}}>
								<span className="menu-item-icon">
									<svg viewBox="0 0 20 20" fill="none">
										<rect
											x="3"
											y="4"
											width="14"
											height="12"
											rx="2"
											stroke="currentColor"
											strokeWidth="1.5"
										/>
										<path
											d="M7 8h6M7 11h4"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
										/>
									</svg>
								</span>
								Plantillas
							</button>
						)}
						<div className="dropdown-divider" />
						<button
							className="menu-item menu-item-logout"
							onClick={() => {
								setMenuOpen(false);
								handleLogout();
							}}>
							<span className="menu-item-icon">
								<svg viewBox="0 0 20 20" fill="none">
									<path
										d="M13 10H3m0 0 3-3m-3 3 3 3"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path
										d="M9 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-1"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
									/>
								</svg>
							</span>
							Cerrar sesión
						</button>
					</div>
				</DropdownPortal>
			)}
		</header>
	);
};

export default Header;
