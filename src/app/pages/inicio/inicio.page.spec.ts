import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { IncidenciasService } from '../../services/incidencias.service';

import { InicioPage } from './inicio.page';

describe('InicioPage', () => {
  let component: InicioPage;
  let fixture: ComponentFixture<InicioPage>;
  let mockIncidenciasService: {
    getIncidencias: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockIncidenciasService = {
      getIncidencias: vi.fn().mockReturnValue(of([{ id: '1' }, { id: '2' }])),
    };

    await TestBed.configureTestingModule({
      imports: [InicioPage],
      providers: [provideRouter([]), { provide: IncidenciasService, useValue: mockIncidenciasService }],
    }).compileComponents();

    fixture = TestBed.createComponent(InicioPage);
    component = fixture.componentInstance;
  });

  it('se crea correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('carga el indicador de conteo en ionViewWillEnter', () => {
    component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.cargandoIndicador()).toBe(false);
    expect(component.totalIncidencias()).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('2');
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
