import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../services/auth.service';

import { LoginPage } from './login.page';

describe('LoginPage (Inicio de Sesión y Registro Municipal)', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;

  let mockAuthService: {
    login: ReturnType<typeof vi.fn>;
    registro: ReturnType<typeof vi.fn>;
    loginRapido: ReturnType<typeof vi.fn>;
    cargando: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    currentUser: ReturnType<typeof vi.fn>;
  };

  let mockRouter: {
    navigateByUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockAuthService = {
      login: vi.fn().mockResolvedValue({ email: 'test@quito.gob.ec' }),
      registro: vi.fn().mockResolvedValue({ email: 'nuevo@quito.gob.ec' }),
      loginRapido: vi.fn().mockResolvedValue({ email: 'inspector@quito.gob.ec' }),
      cargando: vi.fn().mockReturnValue(false),
      error: vi.fn().mockReturnValue(null),
      currentUser: vi.fn().mockReturnValue(null),
    };

    mockRouter = {
      navigateByUrl: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams: { returnUrl: '/incidencias' } },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('se crea correctamente', () => {
    expect(component).toBeTruthy();
    expect(component.modo()).toBe('login');
  });

  it('alterna la visibilidad de la contraseña', () => {
    expect(component.mostrarPassword()).toBe(false);
    component.toggleMostrarPassword();
    expect(component.mostrarPassword()).toBe(true);
  });

  it('cambia entre los modos de inicio de sesión y registro', () => {
    component.cambiarModo('registro');
    expect(component.modo()).toBe('registro');
    component.cambiarModo('login');
    expect(component.modo()).toBe('login');
  });

  it('muestra error si se intenta enviar el login con campos vacíos', async () => {
    component.email.set('');
    component.password.set('');

    await component.onLoginSubmit();

    expect(component.errorLocal()).toContain('correo');
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('invoca el servicio de autenticación y redirige a la URL previa tras login exitoso', async () => {
    component.email.set('inspector@quito.gob.ec');
    component.password.set('Quito2026!');

    await component.onLoginSubmit();

    expect(mockAuthService.login).toHaveBeenCalledWith('inspector@quito.gob.ec', 'Quito2026!');
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/incidencias');
  });

  it('permite el acceso rápido con credenciales de prueba', async () => {
    await component.accesoRapido('inspector');

    expect(mockAuthService.loginRapido).toHaveBeenCalledWith('inspector');
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/incidencias');
  });

  it('valida campos obligatorios en el registro de un nuevo inspector', async () => {
    component.cambiarModo('registro');
    component.displayName.set('');

    await component.onRegistroSubmit();

    expect(component.errorLocal()).toContain('nombre');
    expect(mockAuthService.registro).not.toHaveBeenCalled();
  });
});
