import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import fondoImg from "../assets/FONDO.jpg";
import { useAuth } from "../context/auth-context";
import { useSessionStore } from "../store/session-store";
import useSidebar from "../utils/use-sidebar";
import Header from "./header-principal";
import Sidebar from "./sidebar";
import SidebarHome from "./sidebar-home";

const PageLayout = ({ children, empleadoData, formatRol, getPrimerNombre }) => {
	const [menuOpen, setMenuOpen] = useState(false);
	const { sidebarOpen, setSidebarOpen, isMobile } = useSidebar();
	const menuRef = useRef(null);
	const { user, signOut } = useAuth();
	const empleadoStore = useSessionStore((state) => state.empleadoData);
	const empleadoActual = empleadoData || empleadoStore;
	const navigate = useNavigate();

	const handleLogout = async () => {
		await signOut();
		navigate("/login");
	};

	return (
		<div
			style={{
				minHeight: "100vh",
				backgroundImage: `url(${fondoImg})`,
				backgroundColor: "#020F23",
				backgroundSize: "cover",
				backgroundPosition: "center",
				backgroundAttachment: "fixed",
				backgroundRepeat: "no-repeat",
				display: "flex",
				flexDirection: "column",
			}}>
			<Header
				menuOpen={menuOpen}
				setMenuOpen={setMenuOpen}
				menuRef={menuRef}
				empleadoData={empleadoActual}
				formatRol={formatRol}
				getPrimerNombre={getPrimerNombre}
				user={user}
				handleLogout={handleLogout}
				sidebarOpen={sidebarOpen}
				setSidebarOpen={setSidebarOpen}
			/>

			{isMobile ? (
				<Sidebar
					isOpen={sidebarOpen}
					setIsOpen={setSidebarOpen}
					empleadoData={empleadoActual}
				/>
			) : (
				<SidebarHome empleadoData={empleadoActual} />
			)}

			{children}
		</div>
	);
};

export default PageLayout;
