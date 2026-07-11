import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import notiIcon from "../assets/notificaciones.png";
import { supabase } from "../lib/supabase-client";
import { notificacionEsParaEmpleado } from "../utils/notificaciones";

const formatearTiempo = (fecha) => {
	if (!fecha) return "";
	const diffMs = Date.now() - new Date(fecha).getTime();
	const diffMin = Math.max(0, Math.floor(diffMs / 60000));
	if (diffMin < 1) return "Ahora";
	if (diffMin < 60) return `${diffMin} min`;
	const diffHoras = Math.floor(diffMin / 60);
	if (diffHoras < 24) return `${diffHoras} h`;
	return new Date(fecha).toLocaleDateString("es-MX", {
		day: "2-digit",
		month: "short",
	});
};

const NotificationBell = ({ user, navigate }) => {
	const [open, setOpen] = useState(false);
	const [empleado, setEmpleado] = useState(null);
	const [notificaciones, setNotificaciones] = useState([]);
	const [loading, setLoading] = useState(false);
	const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
	const wrapperRef = useRef(null);
	const menuRef = useRef(null);

	useEffect(() => {
		const cargarEmpleado = async () => {
			if (!user?.id) return;
			if (String(user.id).startsWith("doctor:")) {
				setEmpleado(null);
				return;
			}
			const { data, error } = await supabase
				.from("empleados")
				.select("auth_uuid, rol")
				.eq("auth_uuid", user.id)
				.maybeSingle();
			if (!error && data) setEmpleado(data);
		};

		cargarEmpleado();
	}, [user?.id]);

	useEffect(() => {
		const cargarNotificaciones = async () => {
			if (!user?.id || !empleado) return;
			setLoading(true);
			const { data, error } = await supabase
				.from("notificaciones")
				.select(
					"id, titulo, mensaje, tipo, canal_destino, rol_destino, usuario_destino, entidad_tipo, entidad_id, id_venta, id_sucursal, sucursal, action_path, read_at, created_at",
				)
				.order("created_at", { ascending: false })
				.limit(20);

			if (!error) {
				setNotificaciones(
					(data || []).filter((notificacion) =>
						notificacionEsParaEmpleado(notificacion, empleado, user),
					),
				);
			}
			setLoading(false);
		};

		cargarNotificaciones();
	}, [empleado, user]);

	useEffect(() => {
		if (!user?.id || !empleado) return undefined;
		const channel = supabase
			.channel(`notificaciones-header-${user.id}`)
			.on(
				"postgres_changes",
				{ event: "INSERT", schema: "public", table: "notificaciones" },
				(payload) => {
					const nueva = payload.new;
					if (!notificacionEsParaEmpleado(nueva, empleado, user)) return;
					setNotificaciones((prev) => [
						nueva,
						...prev.filter((item) => item.id !== nueva.id),
					].slice(0, 20));
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [empleado, user]);

	useEffect(() => {
		const cerrarFuera = (event) => {
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(event.target) &&
				menuRef.current &&
				!menuRef.current.contains(event.target)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", cerrarFuera);
		return () => document.removeEventListener("mousedown", cerrarFuera);
	}, []);

	const noLeidas = useMemo(
		() => notificaciones.filter((notificacion) => !notificacion.read_at).length,
		[notificaciones],
	);

	useEffect(() => {
		if (!open || !wrapperRef.current) return undefined;

		const actualizarPosicion = () => {
			const rect = wrapperRef.current.getBoundingClientRect();
			const menuWidth = Math.min(360, window.innerWidth - 24);
			const left = Math.min(
				Math.max(12, rect.left),
				Math.max(12, window.innerWidth - menuWidth - 12),
			);
			setMenuPos({ top: rect.bottom + 10, left });
		};

		actualizarPosicion();
		window.addEventListener("resize", actualizarPosicion);
		window.addEventListener("scroll", actualizarPosicion, true);

		return () => {
			window.removeEventListener("resize", actualizarPosicion);
			window.removeEventListener("scroll", actualizarPosicion, true);
		};
	}, [open]);

	const marcarLeida = async (notificacion) => {
		if (!notificacion?.id || notificacion.read_at) return;
		const readAt = new Date().toISOString();
		setNotificaciones((prev) =>
			prev.map((item) =>
				item.id === notificacion.id ? { ...item, read_at: readAt } : item,
			),
		);
		await supabase
			.from("notificaciones")
			.update({ read_at: readAt })
			.eq("id", notificacion.id);
	};

	const marcarTodasLeidas = async () => {
		const ids = notificaciones
			.filter((notificacion) => !notificacion.read_at)
			.map((notificacion) => notificacion.id);
		if (ids.length === 0) return;
		const readAt = new Date().toISOString();
		setNotificaciones((prev) =>
			prev.map((item) => (ids.includes(item.id) ? { ...item, read_at: readAt } : item)),
		);
		await supabase.from("notificaciones").update({ read_at: readAt }).in("id", ids);
	};

	const abrirNotificacion = async (notificacion) => {
		await marcarLeida(notificacion);
		setOpen(false);
		if (notificacion.action_path) navigate(notificacion.action_path);
	};

	return (
		<div className="notification-wrapper" ref={wrapperRef}>
			<button
				type="button"
				className={`notification-button${open ? " open" : ""}`}
				onClick={() => setOpen((value) => !value)}
				aria-label="Notificaciones">
				<img src={notiIcon} alt="" className="notification-icon" />
				{noLeidas > 0 && (
					<span className="notification-count">{noLeidas > 9 ? "9+" : noLeidas}</span>
				)}
			</button>

			{open &&
				createPortal(
				<div
					ref={menuRef}
					className="notification-menu"
					style={{
						position: "fixed",
						top: menuPos.top,
						left: menuPos.left,
					}}>
					<div className="notification-menu-header">
						<div>
							<strong>Notificaciones</strong>
							<span>{noLeidas} pendientes</span>
						</div>
						<button
							type="button"
							onClick={marcarTodasLeidas}
							disabled={noLeidas === 0}
							className="notification-read-all">
							Leídas
						</button>
					</div>
					<div className="notification-list">
						{loading && (
							<div className="notification-empty">Cargando notificaciones...</div>
						)}
						{!loading && notificaciones.length === 0 && (
							<div className="notification-empty">Sin pendientes por ahora</div>
						)}
						{!loading &&
							notificaciones.map((notificacion) => (
								<button
									type="button"
									key={notificacion.id}
									className={`notification-item${notificacion.read_at ? "" : " unread"}`}
									onClick={() => abrirNotificacion(notificacion)}>
									<span className={`notification-dot ${notificacion.canal_destino}`} />
									<span className="notification-item-body">
										<strong>{notificacion.titulo}</strong>
										<small>{notificacion.mensaje}</small>
									</span>
									<time>{formatearTiempo(notificacion.created_at)}</time>
								</button>
							))}
					</div>
				</div>,
				document.body,
			)}
		</div>
	);
};

export default NotificationBell;
