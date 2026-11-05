import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../services/auth.service';

import { authGuard } from './auth.guard';

describe('authGuard (Protección de rutas de inspección)', () => {
  let mockAuthService: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    restaurarSesion: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAuthService = {
      isAuthenticated: vi.fn(),
      restaurarSesion: vi.fn(),
    };
    mockRouter = {
      createUrlTree: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = { url: '/incidencias' } as RouterStateSnapshot;

  it('permite el acceso si el inspector ya está autenticado', async () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));

    expect(result).toBe(true);
  });

  it('restaura la sesión si no está autenticado inicialmente y permite el paso si se recupera', async () => {
    mockAuthService.isAuthenticated.mockReturnValueOnce(false).mockReturnValueOnce(true);
    mockAuthService.restaurarSesion.mockResolvedValue({ email: 'inspector@quito.gob.ec' });

    const result = await TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));

    expect(mockAuthService.restaurarSesion).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('redirige a /login con returnUrl si el inspector no está autenticado', async () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.restaurarSesion.mockResolvedValue(null);
    const mockTree = {} as UrlTree;
    mockRouter.createUrlTree.mockReturnValue(mockTree);

    const result = await TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/incidencias' },
    });
    expect(result).toBe(mockTree);
  });
});
