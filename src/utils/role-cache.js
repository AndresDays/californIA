const rolesPorUsuario = new Map();

export const obtenerRolCacheado = (userId) =>
	(userId ? rolesPorUsuario.get(userId) : null) || null;

export const guardarRolCacheado = (userId, rol) => {
	if (!userId || !rol) return;
	rolesPorUsuario.set(userId, rol);
};
