import { Component, EventEmitter, Input, Output, HostListener,ElementRef, OnInit } from "@angular/core";

@Component({
    selector: 'app-modal-generic',
    standalone: true,
    templateUrl: './modal-pdf.component.html',
    styleUrl: './modal-pdf.component.css',
    imports: []
})
export class ModalGenericComponent implements OnInit {
    @Input() visible = false;
    @Input() title = 'Modal';
    @Input() size: 'sm' | 'md' | 'lg' = 'md';
    @Input() close = new EventEmitter<void>();
    @Input() submit = new EventEmitter<void>();
    
    constructor(private el: ElementRef){}
    ngOnInit(): void {}
    onClose(){
        this.visible = false;
        this.close.emit();
    }
    backdropClick(e: MouseEvent){
        if ((e.target as HTMLElement).classList.contains('modal-backdrop')){
            this.onClose();
        }
    }

    @HostListener('document:keydown.escape', ['$event'])
    onEsc(event: KeyboardEvent){
        if (this.visible) this.onClose();
    }
}