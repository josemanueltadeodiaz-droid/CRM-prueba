import { Component, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SecureAuthService } from '../../../../core/services/secure-auth.service';
import { UitipografiaComponent } from '../../../../shared/~exports/detail-view.index';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, UitipografiaComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DashboardComponent {
  private authService = inject(SecureAuthService);

  currentUser = this.authService.getCurrentUser();

  //carrusel: lista de imagenes ()
  imagenesCarrusel: string[] = [
    '/imagen1.jpeg',
    '/imagen2.jpeg',
    '/imagen3.jpeg',
    '/imagen4.jpeg',
    '/imagen5.jpeg'
  ];
  indiceActual = 0;
  intervaloCarrusel: any;

  get imagenActual(): string {
    return this.imagenesCarrusel[this.indiceActual];
  }
  ngOnInit(): void{
    this.iniciarCarrusel();
  }

  siguienteImagen(): void{
    this.indiceActual = (this.indiceActual +1) % this.imagenesCarrusel.length;
  }

  iniciarCarrusel(): void {
    this.intervaloCarrusel = setInterval(() => {
      this.siguienteImagen();
    }, 3000);
  }
  detenerCarrusel(): void{
    if (this.intervaloCarrusel){
      clearInterval(this.intervaloCarrusel);
    }
  }

  anteriorImagen(): void {
    this.indiceActual = (
      this.indiceActual - 1 + this.imagenesCarrusel.length) % this.imagenesCarrusel.length;
  }

  seleccionarImagen(indice: number): void {
    this.indiceActual = indice;
  }

  ngOnDestroy() : void{
    this.detenerCarrusel();
  }


  get nombreUsuario(): string {
    if (this.currentUser?.nombreCompleto) {
      return this.currentUser.nombreCompleto;
    }
    if (this.currentUser?.nombre && this.currentUser?.apellido) {
      return `${this.currentUser.nombre} ${this.currentUser.apellido}`;
    }
    if (this.currentUser?.name) {
      return this.currentUser.name;
    }
    return 'Usuario';
  }

  refreshData(): void {
    console.log('Refrescando datos del dashboard...');
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => console.log('Logout exitoso'),
      error: (error) => console.error('Error durante logout:', error)
    });
  }
}
