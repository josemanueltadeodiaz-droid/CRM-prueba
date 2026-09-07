import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../core/services/secure-auth.service';

@Component({
    selector: 'app-ui-avatar',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="w-full h-full aspect-square rounded-full flex items-center justify-center font-semibold"
         [style.background-color]="backgroundColor"
         [style.color]="textColor">
        {{ initials }}
    </div>
    `,
})
export class UiAvatarComponent implements OnChanges {
    @Input() user?: User | null;
    @Input() text?: string;
    @Input() backgroundColor = '#18181b';
    @Input() textColor = '#ffffff';

    initials = 'U';

    ngOnChanges(changes: SimpleChanges): void {
        this.updateInitials();
    }

    private updateInitials(): void {
        // Prioridad de fuentes
        if (this.text) {
            // Prioridad 1: Texto directo
            this.initials = this.formatText(this.text);
        }  else if (this.user) {
            // Prioridad 3: Objeto usuario
            this.initials = this.computeInitialsFromUser(this.user);
        } else {
            this.initials = 'U';
        }
    }

    private formatText(text: string): string {
        return text.trim().substring(0, 2).toUpperCase() || 'U';
    }

    private getInitialsFromRazonSocial(razonSocial: string): string {
        // Limpiar y procesar razón social
        const cleanText = razonSocial.trim();
        
        // Opción A: Tomar las primeras letras de las primeras dos palabras
        const words = cleanText.split(' ').filter(word => word.length > 0);
        
        if (words.length === 0) return 'U';
        if (words.length === 1) return this.formatText(words[0]);
        
        // Tomar primera letra de las dos primeras palabras
        return (words[0][0] + words[1][0]).toUpperCase();
        
        // Opción B: Tomar las primeras dos letras en total
        // return cleanText.substring(0, 2).toUpperCase();
    }

    private computeInitialsFromUser(user: User): string {
        const safe = (s?: string) => (s?.[0] || '').toUpperCase();

        if (user.nombre && user.apellido) {
            return (safe(user.nombre) + safe(user.apellido)) || 'U';
        }

        if (user.nombreCompleto) {
            const parts = user.nombreCompleto.split(' ').filter(Boolean);
            if (parts.length >= 2) return (safe(parts[0]) + safe(parts[parts.length - 1])) || 'U';
            return parts[0].substring(0, 2).toUpperCase() || 'U';
        }

        if (user.name) {
            const parts = user.name.split(' ').filter(Boolean);
            const result = parts.map(p => safe(p)).join('');
            return result.substring(0, 2) || 'U';
        }

        return 'U';
    }
}