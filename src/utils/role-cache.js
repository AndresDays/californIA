const rolesPorUsuario = new Map();

export const obtenerRolCacheado = (userId) =>
	userId ? rolesPorUsuario.get(userId) || "" : "";

export const guardarRolCacheado = (userId, rol) => {
	if (!userId || !rol) return;
	rolesPorUsuario.set(userId, rol);
};
