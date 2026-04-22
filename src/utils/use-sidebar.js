import { useEffect, useState } from 'react';

const useSidebar = () => {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const check = () => setIsMobile(window.innerWidth < 1024);
		check();
		window.addEventListener('resize', check);
		return () => window.removeEventListener('resize', check);
	}, []);

	return { sidebarOpen, setSidebarOpen, isMobile };
};

export default useSidebar;
