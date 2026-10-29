import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import type { Incidencia } from '../../models/incidencia.model';
import { IncidenciasService } from '../../services/incidencias.service';
import { SeguimientoService } from '../../services/seguimiento.service';

import { InicioPage } from './inicio.page';

describe('InicioPage (R10 — Indicadores reactivos y navegación)', () => {
  let component: InicioPage;
  let fixture: ComponentFixture<InicioPage>;
  let mockIncidenciasService: {
    getIncidencias: ReturnType<typeof vi.fn>;
  };
  let mockSeguimientoService: {
    cargarIds: ReturnType<typeof vi.fn>;
  };

  const listaPrueba: Partial<Incidencia>[] = [
    { id: '1', estado: 'pendiente' },
    { id: '2', estado: 'pendiente' },
    { id: '3', estado: 'en_proceso' },
    { id: '4', estado: 'resuelta' },
  ];

  beforeEach(async () => {
    mockIncidenciasService = {
      getIncidencias: vi.fn().mockReturnValue(of(listaPrueba)),
    };
    mockSeguimientoService = {
      cargarIds: vi.fn().mockResolvedValue(['1', '3']),
    };

    await TestBed.configureTestingModule({
      imports: [InicioPage],
      providers: [
        provideRouter([]),
        { provide: IncidenciasService, useValue: mockIncidenciasService },
        { provide: SeguimientoService, useValue: mockSeguimientoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InicioPage);
    component = fixture.componentInstance;
  });

  it('se crea correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('carga el indicador de conteo y desglose de estados en ionViewWillEnter (R10)', async () => {
    component.ionViewWillEnter();
    // Esperar resolución de promesas microtask de seguimientoService
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.cargandoIndicador()).toBe(false);
    expect(component.totalIncidencias()).toBe(4);
    expect(component.pendientes()).toBe(2);
    expect(component.enProceso()).toBe(1);
    expect(component.resueltas()).toBe(1);
    expect(component.enSeguimiento()).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('4');
    expect(compiled.textContent).toContain('Pendientes');
    expect(compiled.textContent).toContain('En proceso');
    expect(compiled.textContent).toContain('Resueltas');
    expect(compiled.textContent).toContain('Seguimiento');
  });

  it('contiene los tres accesos de navegación con sus rutas correspondientes', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const enlaces = compiled.querySelectorAll('a.acceso-card');

    expect(enlaces.length).toBe(3);

    const hrefs = Array.from(enlaces).map((a) => a.getAttribute('routerlink') ?? a.getAttribute('href'));
    expect(hrefs.some((h) => h?.includes('/incidencias'))).toBe(true);
    expect(hrefs.some((h) => h?.includes('/registro'))).toBe(true);
    expect(hrefs.some((h) => h?.includes('/seguimiento'))).toBe(true);
  });
});
