import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import notiIcon from "../assets/notificaciones.png";
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
			{/* ── Izquierda: hamburguesa + campana + título ── */}
			<div className="header-left">
				<button
					className={`hamburger-btn${sidebarOpen ? " active" : ""}`}
					onClick={() => setSidebarOpen?.((v) => !v)}
					aria-label="Abrir menú">
					<span />
					<span />
					<span />
				</button>
				<img src={notiIcon} alt="Notificaciones" className="notification-icon" />
				<h1 className="header-title">{rol || "Cargando..."}</h1>
			</div>

			{/* ── Derecha: nombre + avatar ── */}
			<div className="header-right" ref={menuRef}>
				<span className="user-name">
					{empleadoData ? getPrimerNombre(empleadoData.nombre) : "Cargando..."}
				</span>
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
						<button className="menu-item">
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
