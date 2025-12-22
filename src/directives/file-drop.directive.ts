import { Directive, HostBinding, HostListener, output, signal } from '@angular/core';

@Directive({
  selector: '[appFileDrop]',
  standalone: true
})
export class FileDropDirective {
  fileDropped = output<FileList>();
  
  // State signal that can be read by the host component if they inject the directive,
  // or simply used for the class binding below.
  isDragOver = signal(false);

  @HostBinding('class.drag-over') 
  get dragOverClass() {
    return this.isDragOver();
  }

  @HostListener('dragover', ['$event']) 
  onDragOver(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.isDragOver.set(true);
  }

  @HostListener('dragleave', ['$event']) 
  onDragLeave(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.isDragOver.set(false);
  }

  @HostListener('drop', ['$event']) 
  onDrop(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.isDragOver.set(false);
    
    const files = evt.dataTransfer?.files;
    if (files && files.length > 0) {
      this.fileDropped.emit(files);
    }
  }
}