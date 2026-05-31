import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import fondoImg from "../assets/FONDO.jpg";
import { useAuth } from "../context/auth-context";
import useSidebar from "../utils/use-sidebar";
import Header from "./header-principal";
import Sidebar from "./sidebar";
import SidebarHome from "./sidebar-home";

const PageLayout = ({ children, empleadoData, formatRol, getPrimerNombre }) => {
	const [menuOpen, setMenuOpen] = useState(false);
	const { sidebarOpen, setSidebarOpen, isMobile } = useSidebar();
	const menuRef = useRef(null);
	const { user, signOut } = useAuth();
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
				backgroundSize: "cover",
				backgroundPosition: "center",
				backgroundAttachment: "fixed",
				display: "flex",
				flexDirection: "column",
			}}>
			<Header
				menuOpen={menuOpen}
				setMenuOpen={setMenuOpen}
				menuRef={menuRef}
				empleadoData={empleadoData}
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
					empleadoData={empleadoData}
				/>
			) : (
				<SidebarHome empleadoData={empleadoData} />
			)}

			{children}
		</div>
	);
};

export default PageLayout;
