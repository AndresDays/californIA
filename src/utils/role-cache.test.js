// role-cache.test.js
import { obtenerRolCacheado, guardarRolCacheado } from './role-cache';

// The cache is module-level (Map), so tests share state.
// We clear state by saving new values or by using different user IDs.

describe('role-cache — obtenerRolCacheado', () => {
  test('devuelve null si userId es null', () => {
    expect(obtenerRolCacheado(null)).toBeNull();
  });

  test('devuelve null si userId es undefined', () => {
    expect(obtenerRolCacheado(undefined)).toBeNull();
  });

  test('devuelve null si el userId no ha sido cacheado', () => {
    expect(obtenerRolCacheado('usuario-no-existe')).toBeNull();
  });

  test('devuelve el rol cacheado para un userId válido', () => {
    guardarRolCacheado('user-abc', 'admin');
    expect(obtenerRolCacheado('user-abc')).toBe('admin');
  });
});

describe('role-cache — guardarRolCacheado', () => {
  test('guarda y recupera un rol correctamente', () => {
    guardarRolCacheado('user-123', 'recepcionista');
    expect(obtenerRolCacheado('user-123')).toBe('recepcionista');
  });

  test('actualiza el rol si se llama de nuevo con el mismo userId', () => {
    guardarRolCacheado('user-update', 'quimico');
    guardarRolCacheado('user-update', 'admin');
    expect(obtenerRolCacheado('user-update')).toBe('admin');
  });

  test('no guarda nada si userId es falsy', () => {
    guardarRolCacheado(null, 'admin');
    guardarRolCacheado(undefined, 'admin');
    guardarRolCacheado('', 'admin');
    // These should not throw and should not affect valid lookups
    expect(obtenerRolCacheado(null)).toBeNull();
  });

  test('no guarda nada si rol es falsy', () => {
    guardarRolCacheado('user-sin-rol', null);
    guardarRolCacheado('user-sin-rol', '');
    guardarRolCacheado('user-sin-rol', undefined);
    expect(obtenerRolCacheado('user-sin-rol')).toBeNull();
  });

  test('cachea roles distintos para distintos userIds', () => {
    guardarRolCacheado('user-A', 'radiologo');
    guardarRolCacheado('user-B', 'tecnico');
    expect(obtenerRolCacheado('user-A')).toBe('radiologo');
    expect(obtenerRolCacheado('user-B')).toBe('tecnico');
  });
});
