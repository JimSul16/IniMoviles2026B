import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService, CLAVE_AUTH_USUARIO } from './auth.service';

describe('AuthService (Firebase Auth + Sesión Municipal)', () => {
  let service: AuthService;

  beforeEach(async () => {
    await Preferences.clear();

    TestBed.configureTestingModule({
      providers: [AuthService],
    });

    service = TestBed.inject(AuthService);
  });

  it('se crea correctamente con estado inicial no autenticado', () => {
    expect(service).toBeTruthy();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('permite iniciar sesión con credenciales de inspector municipal demo', async () => {
    const usuario = await service.login('inspector@quito.gob.ec', 'Quito2026!');

    expect(usuario).toBeTruthy();
    expect(usuario.email).toBe('inspector@quito.gob.ec');
    expect(usuario.rol).toBe('inspector');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.displayName).toContain('Juan Carlos');

    // Verifica persistencia en Preferences
    const { value } = await Preferences.get({ key: CLAVE_AUTH_USUARIO });
    expect(value).toBeTruthy();
    expect(JSON.parse(value || '{}').email).toBe('inspector@quito.gob.ec');
  });

  it('permite iniciar sesión con credenciales de supervisora técnica demo', async () => {
    const usuario = await service.login('supervisor@quito.gob.ec', 'Quito2026!');

    expect(usuario.email).toBe('supervisor@quito.gob.ec');
    expect(usuario.rol).toBe('supervisor');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('el método loginRapido asigna las credenciales preconfiguradas correctas', async () => {
    const inspector = await service.loginRapido('inspector');
    expect(inspector.email).toBe('inspector@quito.gob.ec');

    await service.logout();
    expect(service.isAuthenticated()).toBe(false);

    const supervisor = await service.loginRapido('supervisor');
    expect(supervisor.email).toBe('supervisor@quito.gob.ec');
  });

  it('rechaza contraseñas menores a 6 caracteres en modo local', async () => {
    await expect(service.login('usuario.nuevo@quito.gob.ec', '123')).rejects.toThrow();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('permite registrar un nuevo inspector y persiste su información', async () => {
    const nuevo = await service.registro({
      email: 'fiscalizador.norte@quito.gob.ec',
      password: 'SeguraPassword2026!',
      displayName: 'Ing. Carlos Zambrano',
      departamento: 'Fiscalización Norte DMQ',
    });

    expect(nuevo.email).toBe('fiscalizador.norte@quito.gob.ec');
    expect(nuevo.displayName).toBe('Ing. Carlos Zambrano');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('logout limpia la sesión en memoria y en Preferences', async () => {
    await service.loginRapido('inspector');
    expect(service.isAuthenticated()).toBe(true);

    await service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();

    const { value } = await Preferences.get({ key: CLAVE_AUTH_USUARIO });
    expect(value).toBeNull();
  });

  it('restaurarSesion recupera un usuario previamente guardado en Preferences', async () => {
    const mockUser = {
      uid: 'recuperado-123',
      email: 'recuperado@quito.gob.ec',
      displayName: 'Inspector Recuperado',
      rol: 'inspector' as const,
    };

    await Preferences.set({
      key: CLAVE_AUTH_USUARIO,
      value: JSON.stringify(mockUser),
    });

    const restaurado = await service.restaurarSesion();
    expect(restaurado).toBeTruthy();
    expect(restaurado?.email).toBe('recuperado@quito.gob.ec');
    expect(service.isAuthenticated()).toBe(true);
  });
});
