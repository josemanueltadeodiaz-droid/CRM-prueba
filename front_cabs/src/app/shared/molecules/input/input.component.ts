import { Component, Input, Output, EventEmitter, OnInit, forwardRef, HostListener, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiIconComponent } from '../../atoms/icono/icono.component';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

export interface SelectOption {
  value: string | number | boolean;
  label: string;
  disabled?: boolean;
}

export interface RadioOption extends SelectOption {
  description?: string;
  icon?: string;
}

export type InputVariant =
  | 'text' | 'code' | 'email' | 'password' | 'tel' | 'number' | 'search'
  | 'url' | 'file' | 'button' | 'reset' | 'submit' | 'radio'
  | 'checkbox' | 'range' | 'image' | 'select' | 'info'
  | 'date' | 'month' | 'year' | 'textarea' | 'toggle' | 'locked'
  | 'filter-input' | 'filter-select' | 'filter-checkbox' | 'radio-select';

export type ToggleSize = 'small' | 'medium' | 'large';
export type RadioLayout = 'vertical' | 'horizontal' | 'grid' | 'card' | 'two-cards';

@Component({
  selector: 'app-ui-input-field',
  standalone: true,
  imports: [CommonModule, UiIconComponent, FormsModule],
  templateUrl: './input.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiInputComponent),
      multi: true
    }
  ]
})
export class UiInputComponent implements OnInit, ControlValueAccessor {
  /* ===== INPUTS PRINCIPALES ===== */
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() variant: InputVariant = 'text';
  @Input() textoError: string = '';
  @Input() labelObligatorio: boolean = false;
  @Input() nombreIcono: string = 'user';

  @Input() visualizarIcono: boolean = true; 

  // Nueva propiedad para controlar si el campo es editable
  @Input() editable: boolean = false;

  // Nueva propiedad para disabled (agregada en versión mejorada)
  @Input() disabled: boolean = false;

  // Propiedades adicionales (nuevas versiones)
  @Input() readonly: boolean = false;
  @Input() helpText: string = '';
  @Input() codeLength: number = 6;
  @Input() options: SelectOption[] = [];
  @Input() loading: boolean = false;
  @Input() loadingText: string = 'Cargando...';
  @Input() emptyText: string = 'No hay opciones disponibles';
  @Input() rows: number = 4;
  @Input() maxLength?: number;
  @Input() showCharCount: boolean = false;
  @Input() toggleSize: ToggleSize = 'medium';
  @Input() checkboxDescription?: string;

  // Propiedades específicas para radio
  @Input() radioOptions: RadioOption[] = [];
  @Input() radioLayout: RadioLayout = 'vertical';
  @Input() showRadioAsSelect: boolean = false;
  @Input() showRadioIcons: boolean = false;
  @Input() radioColumns: number = 2;

  @Input() checked: boolean = false;

  /* ===== VALUE DEL INPUT ===== */
  @Input() value: any = '';
  editMode = false;
  originalValue: any = '';
  tempValue: any = '';

  /* ===== OUTPUTS OPCIONALES ===== */
  @Output() valueChange = new EventEmitter<any>();
  @Output() checkedChange = new EventEmitter<boolean>();
  @Output() selectionChange = new EventEmitter<SelectOption | null>();
  @Output() toggle = new EventEmitter<boolean>();
  @Output() radioChange = new EventEmitter<any>();

  /* ===== CONTROL VALUE ACCESSOR ===== */
  onChange: any = () => {};
  onTouched: any = () => {};

  // Propiedad interna para disabled (original - mantener compatibilidad)
  isDisabled = false;

  /* ===== ESTADO INTERNO ===== */
  isFocused: boolean = false;
  @Input() iconoVisible: boolean = true;
  isPasswordVisible: boolean = false; // Nueva propiedad para visibilidad de contraseña
  codeDigits: string[] = [];
  dropdownAbierto = false;
  radioDropdownAbierto = false;
  textoErrores: string[] = [];

  // Inyectar ChangeDetectorRef para manejar actualizaciones visuales
  private readonly cdr = inject(ChangeDetectorRef);

  /* ===== GETTERS PARA MODOS ESPECIALES ===== */

  // Nueva propiedad para determinar si el campo es solo lectura (info)
  get isInfoMode(): boolean {
    return this.variant === 'info';
  }

  get isLockedMode(): boolean {
    return this.variant === 'locked';
  }

  get isFilterVariant(): boolean {
    return this.variant === 'filter-input' ||
           this.variant === 'filter-select' ||
           this.variant === 'filter-checkbox';
  }

  get isRadioSelect(): boolean {
    return this.variant === 'radio-select' || (this.variant === 'radio' && this.showRadioAsSelect);
  }

  get isRadioVariant(): boolean {
    return this.variant === 'radio' || this.variant === 'radio-select';
  }

  get hasIcon(): boolean {
    return !!this.nombreIcono ||
           this.variant === 'date' ||
           this.variant === 'month' ||
           this.variant === 'year';
  }

  get defaultIcon(): string {
    if (this.nombreIcono) return this.nombreIcono;

    switch (this.variant) {
      case 'date':
      case 'month':
      case 'year':
        return 'calendar';
      case 'email':
        return 'envelope';
      case 'tel':
        return 'phone';
      case 'search':
      case 'filter-input':
        return 'magnifying-glass';
      case 'password':
        // Mostrar candado como icono principal, el ojo será un botón separado
        return 'lock-closed';
      case 'url':
        return 'globe-alt';
      case 'radio':
      case 'radio-select':
        return 'radio-button';
      default:
        return this.nombreIcono;
    }
  }

  get placeholderText(): string {
    if (this.loading) return this.loadingText;
    if (this.options.length === 0 &&
      (this.variant === 'select' || this.variant === 'filter-select')) {
      return this.emptyText;
    }

    if (this.isRadioSelect && this.radioOptions.length === 0) {
      return this.emptyText;
    }

    if (this.isRadioSelect && this.value) {
      const selected = this.radioOptions.find(opt => opt.value?.toString() === this.value?.toString());
      return selected ? selected.label : this.placeholder || 'Seleccione una opción';
    }

    return this.placeholder || 'Seleccione una opción';
  }

  get charCount(): string {
    if (!this.showCharCount || !this.maxLength) return '';
    const currentLength = (this.value || '').length;
    return `${currentLength}/${this.maxLength}`;
  }

  get toggleSizeClass(): string {
    return `toggle-${this.toggleSize}`;
  }

  get radioGridClass(): string {
    return `grid-cols-${this.radioColumns}`;
  }

  get mostrarLabelRojo() {
    return (this.labelObligatorio && !this.value) || !!this.textoError;
  }

  /* ===== CONTROL VALUE ACCESSOR - IMPLEMENTACIÓN ===== */

  writeValue(value: any): void {
    console.log('🔍 writeValue - value recibido:', value, 'tipo:', typeof value);

    // Manejo especial para toggle
    if (this.variant === 'toggle') {
      this.value = !!value;
      return;
    }

    // Manejo especial para filter-checkbox
    if (this.variant === 'filter-checkbox') {
      this.checked = !!value;
      this.value = value;
      // Forzar actualización visual
      this.cdr.detectChanges();
      return;
    }

    // Manejo especial para checkbox
    if (this.variant === 'checkbox') {
      console.log('🔍 writeValue - procesando checkbox');

      // Determinar el valor booleano
      let booleanValue = false;

      if (typeof value === 'boolean') {
        booleanValue = value;
      } else if (value === 'true' || value === true) {
        booleanValue = true;
      } else if (value === 'false' || value === false) {
        booleanValue = false;
      }

      console.log('🔍 writeValue - booleanValue determinado:', booleanValue);

      // Actualizar ambos estados sincronizados
      this.checked = booleanValue;
      this.value = booleanValue ? 'true' : 'false';

      // Forzar actualización visual
      this.cdr.detectChanges();

      console.log('🔍 writeValue - this.checked:', this.checked);
      console.log('🔍 writeValue - this.value:', this.value);
      return;
    }

    this.value = value ?? '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  /**
   * Sincroniza el estado disabled entre isDisabled (original) y disabled (nuevo)
   * Mantiene compatibilidad con código legacy que usa isDisabled
   * y permite usar disabled desde el template padre
   */
  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    this.disabled = isDisabled;
  }

  /* ===== LIFECYCLE HOOKS ===== */

  ngOnInit() {
    // Inicialización para variant 'code'
    if (this.variant === 'code') {
      this.codeDigits = Array(this.codeLength).fill('');
      if (this.value) {
        this.codeDigits = this.value.split('').slice(0, this.codeLength);
      }
    }

    // Inicialización para checkbox - asegurar sincronización
    if (this.variant === 'checkbox') {
      console.log('🔍 ngOnInit - checkbox, value:', this.value, 'checked:', this.checked);

      // Si hay valor pero checked no está sincronizado
      if (this.value && this.checked === undefined) {
        this.checked = this.value === 'true';
        this.cdr.detectChanges();
      }

      // Si hay checked pero value no está sincronizado
      if (this.checked !== undefined && !this.value) {
        this.value = this.checked ? 'true' : 'false';
        this.cdr.detectChanges();
      }
    }
  }

  /* ===== MÉTODOS PARA OBTENER VALOR A MOSTRAR ===== */

  // Método para obtener el valor a mostrar en modo visualización
  getDisplayValue(): string {
    if ((this.variant === 'select' || this.variant === 'filter-select') && this.value) {
      const option = this.options.find(opt => opt.value?.toString() === this.value?.toString());
      return option ? option.label : this.value;
    }

    if (this.isRadioSelect && this.value) {
      const option = this.radioOptions.find(opt => opt.value?.toString() === this.value?.toString());
      return option ? option.label : this.value;
    }

    if (this.variant === 'checkbox') {
      return this.value === 'true' ? 'Sí' : 'No';
    }

    if (this.variant === 'filter-checkbox') {
      return this.checked ? 'Sí' : 'No';
    }

    if (this.variant === 'password') {
      // En modo visualización, mostrar texto si está visible, de lo contrario puntos
      if (this.isPasswordVisible && (this.value || this.tempValue)) {
        return this.editMode ? this.tempValue || '' : this.value || '';
      }
      return '••••••••';
    }

    if (this.variant === 'toggle') {
      return this.value ? 'Activado' : 'Desactivado';
    }

    if (this.variant === 'email' && this.value) {
      return this.value;
    }

    if (this.variant === 'tel' && this.value) {
      return this.value;
    }

    return this.value || '';
  }

  /* ===== MÉTODOS PARA VISIBILIDAD DE CONTRASEÑA ===== */

  // Método para alternar visibilidad de contraseña
  togglePasswordVisibility(): void {
    if (this.disabled || this.readonly) return;
    this.isPasswordVisible = !this.isPasswordVisible;
    this.cdr.detectChanges();
  }

  /* ===== MÉTODOS PARA MODO EDICIÓN ===== */

  // Método para activar modo edición (no permitir para variant info)
  activarEdicion(): void {
    if (this.isInfoMode || this.isLockedMode || !this.editable ||
        this.isDisabled || this.disabled) {
      return;
    }

    this.originalValue = this.value;
    this.tempValue = this.value;
    this.editMode = true;

    // Resetear visibilidad de contraseña al activar edición
    this.isPasswordVisible = false;

    // Enfocar el input después de un breve delay
    setTimeout(() => {
      const input = document.querySelector('input, select, textarea') as HTMLElement;
      if (input) input.focus();
    }, 50);
  }

  // Método para guardar cambios
  guardarCambios(): void {
    if (this.validate()) {
      this.value = this.tempValue;
      this.editMode = false;
      this.isPasswordVisible = false; // Ocultar contraseña después de guardar

      // Actualizar codeDigits si es variant code
      if (this.variant === 'code' && this.value) {
        this.codeDigits = this.value.split('').slice(0, this.codeLength);
      }

      // Emitir cambios
      this.onChange(this.value);
      this.valueChange.emit(this.value);

      if (this.isRadioVariant) {
        const selectedOption = this.radioOptions.find(opt => opt.value?.toString() === this.value?.toString());
        this.radioChange.emit(selectedOption || null);
      }

      this.onTouched();
    }
  }

  // Método para cancelar edición
  cancelarEdicion(): void {
    this.value = this.originalValue;
    this.editMode = false;
    this.isPasswordVisible = false; // Ocultar contraseña al cancelar
    this.textoError = '';
    this.textoErrores = [];
    this.onTouched();
  }

  // Método para desactivar edición (con validación)
  desactivarEdicion(): void {
    if (this.validate()) {
      this.guardarCambios();
    }
  }

  /* ===== MANEJADORES DE EVENTOS ===== */

  onTextChange(event: Event) {
    if (this.disabled) return;

    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (this.editMode) {
      // En modo edición, guardamos en tempValue
      this.tempValue = value;
    } else {
      // En modo normal, actualizamos directamente el value
      this.value = value;
      this.onChange(this.value);
      this.valueChange.emit(this.value);
    }

    this.validate();
  }

  onTextareaChange(value: string): void {
    if (this.disabled) return;

    if (this.editMode) {
      this.tempValue = value;
    } else {
      this.value = value;
      this.onChange(value);
      this.valueChange.emit(value);
    }
  }

  onDigitChange(index: number, event: Event) {
    if (this.disabled) return;

    const input = event.target as HTMLInputElement;
    const digit = input.value.slice(0, 1);

    this.codeDigits[index] = digit;
    const code = this.codeDigits.join('');

    this.tempValue = code;
    this.validate();

    // Mover foco al siguiente input
    const next = input.nextElementSibling as HTMLInputElement;
    if (digit && next) {
      next.focus();
    }
  }

  // MÉTODO ACTUALIZADO PARA CHECKBOX - USANDO ngModel
  onCheckboxModelChange(isChecked: boolean): void {
    if (this.disabled) return;

    console.log('🔍 Checkbox cambiado a:', isChecked, 'variant:', this.variant);

    // PASO 1: Actualizar el estado visual INMEDIATAMENTE
    this.checked = isChecked;

    // PASO 2: Forzar la actualización del template (esto arregla el icono del check)
    this.cdr.detectChanges();

    // Manejo para filter-checkbox
    if (this.variant === 'filter-checkbox') {
      console.log('🔍 Procesando filter-checkbox');
      // Para filter-checkbox, solo necesitamos el valor booleano
      this.onChange(isChecked);
      this.checkedChange.emit(isChecked);
      this.onTouched();
      this.validate();
      return;
    }

    // Manejo para checkbox normal
    if (this.variant === 'checkbox') {
      console.log('🔍 Procesando checkbox normal');
      const stringValue = isChecked ? 'true' : 'false';

      if (this.editMode) {
        this.tempValue = stringValue;
      } else {
        this.value = stringValue;
        // Para formularios reactivos - emitir el valor booleano
        this.onChange(isChecked);
        this.valueChange.emit(stringValue);
      }

      // Emitir evento específico de checkbox
      this.checkedChange.emit(isChecked);

      this.onTouched();
      this.validate();
    }

    console.log('🔍 Estado después del cambio:', {
      checked: this.checked,
      value: this.value
    });
  }

  onSelectChange(event: Event): void {
    if (this.disabled) return;

    const select = event.target as HTMLSelectElement;
    const value = select.value || null;

    if (this.editMode) {
      this.tempValue = value;
    } else {
      this.value = value;
      this.onChange(value);
      this.valueChange.emit(value);

      const selectedOption = this.options.find(opt => opt.value?.toString() === value);
      this.selectionChange.emit(selectedOption || null);
    }

    this.onTouched();
    this.validate();
  }

  onRadioChange(value: any): void {
    if (this.disabled) return;

    if (this.editMode) {
      this.tempValue = value;
    } else {
      this.value = value;
      this.onChange(value);
      this.valueChange.emit(value);

      const selectedOption = this.radioOptions.find(opt => opt.value?.toString() === value?.toString());
      this.radioChange.emit(selectedOption || null);
      this.selectionChange.emit(selectedOption || null);

      // Cerrar dropdown si está en modo select
      if (this.isRadioSelect) {
        this.radioDropdownAbierto = false;
      }
    }

    this.onTouched();
    this.validate();
  }

  onToggle(): void {
    if (this.disabled) return;

    this.value = !this.value;
    this.onChange(this.value);
    this.valueChange.emit(this.value);
    this.toggle.emit(this.value);
    this.onTouched();
  }

  toggleDropdown() {
    if (!this.isDisabled && !this.disabled && !this.isInfoMode && !this.isLockedMode) {
      this.dropdownAbierto = !this.dropdownAbierto;
    }
  }

  toggleRadioDropdown() {
    if (!this.isDisabled && !this.disabled && !this.isInfoMode && !this.isLockedMode && this.isRadioSelect) {
      this.radioDropdownAbierto = !this.radioDropdownAbierto;
    }
  }

  seleccionar(valor: string) {
    if (this.disabled) return;

    this.tempValue = valor;
    this.dropdownAbierto = false;

    if (!this.editMode) {
      this.value = valor;
      this.onChange(this.value);
      this.valueChange.emit(this.value);

      const selectedOption = this.options.find(opt => opt.value?.toString() === valor);
      this.selectionChange.emit(selectedOption || null);
    }

    this.validate();
  }

  onFocus() {
    if (this.disabled) return;
    this.isFocused = true;
  }

  onBlur() {
    this.isFocused = false;
    if (this.variant !== 'select' && this.variant !== 'filter-select' && !this.isRadioSelect) {
      this.onTouched();
    }
  }

  /* ===== LISTENER PARA CERRAR DROPDOWN ===== */

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const radioSelectContainer = document.querySelector('.radio-select-container');

    if (radioSelectContainer && !radioSelectContainer.contains(target)) {
      this.radioDropdownAbierto = false;
    }

    if (this.dropdownAbierto) {
      const selectContainer = document.querySelector('.select-dropdown-container');
      if (selectContainer && !selectContainer.contains(target)) {
        this.dropdownAbierto = false;
      }
    }
  }

  /* ===== VALIDACIONES ===== */

  setError(msg: string) {
    this.textoError = msg;
  }

  clearError() {
    this.textoError = '';
  }

  validate(): boolean {
    this.textoErrores = [];
    const valueToValidate = this.editMode ? this.tempValue : this.value;

    // Validación de campo obligatorio
    if (this.labelObligatorio && !valueToValidate) {
      this.setError(`El ${this.label.toLowerCase()} es obligatorio`);
      return false;
    }

    // Validación de email
    if (this.variant === 'email' && valueToValidate &&
        !/\S+@\S+\.\S+/.test(valueToValidate)) {
      this.setError('Correo inválido');
      return false;
    }

    // Validación de teléfono
    if (this.variant === 'tel' && valueToValidate) {
      if (/[a-zA-Z]/.test(valueToValidate)) {
        this.setError('Teléfono inválido, contiene letras');
        return false;
      }
      if (/[^0-9\s+\-()]/.test(valueToValidate)) {
        this.setError('Teléfono inválido, contiene símbolos no permitidos');
        return false;
      }
    }

    // Validación de contraseña
    if (this.variant === 'password' && valueToValidate) {
      if (!/[A-Z]/.test(valueToValidate)) {
        this.textoErrores.push('La contraseña debe tener una mayúscula');
      }
      if (valueToValidate.length < 8) {
        this.textoErrores.push('Debe tener mínimo 8 caracteres');
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(valueToValidate)) {
        this.textoErrores.push('La contraseña debe tener un símbolo');
      }
    }

    this.clearError();
    return this.textoErrores.length === 0;
  }

  /* ===== ESTILOS Y CLASES ===== */

  // Clases para modo visualización
  obtenerClasesVisualizacion(): string {
    const baseClasses = `
      min-h-[44px] px-3 py-2.5 rounded-md border
      bg-gray-50 text-slate-600 text-sm font-normal
      flex items-center w-full
      transition-colors duration-200
      hover:bg-gray-100
      border
      border-neutral-100
    `;

    // Si es info/locked mode, el cursor es default
    // Si está disabled, cursor not-allowed
    // Si no, cursor pointer para indicar que es editable
    const cursorClass = this.disabled ? 'cursor-not-allowed opacity-70' :
                       this.isInfoMode || this.isLockedMode ? 'cursor-default' :
                       'cursor-pointer';

    return `${baseClasses} ${cursorClass}`;
  }

  obtenerClasesInput(): string {
    const baseInput = `
      rounded-md font-normal pl-8 pr-3 py-3 text-sm
      focus:outline-none focus:ring-1
      w-full
      text-[var(--color-texto-icono)]
      focus:ring-blue-500
      disabled:opacity-50 disabled:cursor-not-allowed
      bg-gray-50
    `;

    const baseInputSelect = `
      rounded-md font-normal pl-3 pr-3 py-3 text-sm
      focus:outline-none focus:ring-1
      w-full
      text-[var(--color-texto-icono)]
      focus:ring-blue-500
      disabled:opacity-50 disabled:cursor-not-allowed
      bg-gray-50
    `;

    const baseInputSearch = `
      rounded-md font-normal pl-8 pr-3 py-3 text-sm
      focus:outline-none focus:ring-1
      w-full
      text-[var(--color-texto-icono)]
      focus:ring-blue-500
      disabled:opacity-50 disabled:cursor-not-allowed
      bg-gray-50
    `;

    // Si hay error, solo halo rojo en foco
    const error = this.textoError ? 'text-red-500 focus:ring-red-500 border-red-500' : '';

    // Si no está enfocado, mantenemos borde normal
    const borde = this.isFocused ? 'border border-transparent' : 'border border-neutral-200';

    // Selecciona la base según el variant
    let base = '';
    switch (this.variant) {
      case 'select':
      case 'filter-select':
      case 'radio-select':
        base = baseInputSelect;
        break;
      case 'search':
      case 'filter-input':
        base = baseInputSearch;
        break;
      default:
        base = baseInput;
        break;
    }

    const disabledClass = this.disabled ? 'opacity-50 cursor-not-allowed' : '';

    return `${base} ${error} ${borde} ${disabledClass}`;
  }

  getColorIcono(): string {
    if (this.disabled) return 'text-gray-400';
    if (this.textoError || this.textoErrores.length > 0) {
      return 'text-red-500';
    }
    if (this.isFocused) {
      return 'text-blue-500';
    }
    return 'text-zinc-500';
  }

  getRadioLayoutClass(): string {
    switch (this.radioLayout) {
      case 'horizontal':
        return 'flex flex-row flex-wrap gap-4';
      case 'grid':
        return `grid grid-cols-${this.radioColumns} gap-2`;
      case 'card':
        return 'flex flex-col gap-4';
      case 'two-cards':
        return 'w-full';
      default: // vertical
        // Si hay exactamente 2 opciones en modo vertical, también usar diseño especial
        if (this.radioOptions.length === 2) {
          return 'w-full';
        }
        return 'flex flex-col gap-2';
    }
  }

  // Método para obtener clases específicas para opciones de radio
  getRadioOptionClasses(option: RadioOption): string {
    const isSelected = (this.editMode ? this.tempValue : this.value)?.toString() === option.value?.toString();
    const isDisabled = option.disabled || this.disabled;

    if (this.radioLayout === 'card') {
      return `
        w-full min-h-[100px] border-2 rounded-md flex flex-col p-3 gap-2 cursor-pointer transition-all duration-200
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-neutral-100 hover:border-blue-300 hover:bg-blue-50/50'}
        ${isDisabled ? 'opacity-50 cursor-not-allowed hover:border-neutral-100 hover:bg-transparent' : ''}
      `;
    } else if (this.radioLayout === 'horizontal') {
      return `
        flex items-center py-2 px-4 cursor-pointer transition-colors duration-200
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:text-blue-600'}
      `;
    } else {
      // vertical por defecto
      return `
        flex items-start py-2 cursor-pointer transition-colors duration-200
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:text-blue-600'}
      `;
    }
  }
}
