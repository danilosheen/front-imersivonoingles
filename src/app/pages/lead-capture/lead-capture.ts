import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LeadService } from '../../services/lead.service';

@Component({
  selector: 'app-lead-capture',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lead-capture.html',
  styleUrl: './lead-capture.css',
})
export class LeadCapture implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly leadService = inject(LeadService);

  // Modal and Interactive states
  protected readonly isContactModalOpen = signal(false);
  protected readonly activeSpreadsheetImageIndex = signal(0);
  protected readonly loadedIndexes = signal<number[]>([0]);
  protected readonly showProgressBar = signal(true);

  // Custom Video Player States
  protected readonly isVideoPlaying = signal(false);
  protected readonly isVideoMuted = signal(false);
  protected readonly videoProgress = signal(0);
  protected readonly videoDuration = signal(0);
  protected readonly videoCurrentTime = signal(0);
  protected readonly isVideoHovered = signal(false);

  // Autoplay properties
  private autoplayInterval: any;

  // Form submission states
  protected readonly isSubmittingEmail = signal(false);
  protected readonly submitEmailSuccess = signal(false);

  protected readonly isSubmittingWhatsapp = signal(false);
  protected readonly submitWhatsappSuccess = signal(false);

  // Form 1: Email Capture (Section 1)
  protected readonly emailForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9\s()+-]{8,20}$/)]],
  });

  // Form 2: Contact/WhatsApp Capture (Header Modal)
  protected readonly whatsappForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    whatsapp: ['', [Validators.required, Validators.pattern(/^[0-9\s()+-]{8,20}$/)]],
  });

  // Drag tracking state
  private dragStartX = 0;
  private isDragging = false;

  protected readonly spreadsheetPages = [
    {
      title: 'Acompanhe sua Evolução',
      description: 'Veja os gráficos que mostram o quanto você já aprendeu, seu nivel e os dias que estudou.',
      image: 'assets/gif1.gif',
    },
    {
      title: 'Conteúdo Organizado',
      description: 'Navegue pelo conteúdo organizado por módulos, expressões e níveis para facilitar seus estudos.',
      image: 'assets/gif2.gif',
    },
    {
      title: 'Registro de Vocabulário',
      description: 'Marque cada palavra aprendida e acompanhe sua evolução pelos gráfico que atulizam automaticamente.',
      image: 'assets/gif3.gif',
    }
  ];

  // Helper getters for validation checks
  get ef() {
    return this.emailForm.controls;
  }

  get wf() {
    return this.whatsappForm.controls;
  }

  ngOnInit() {
    this.startAutoplay();
  }

  ngOnDestroy() {
    this.stopAutoplay();
  }

  private startAutoplay() {
    this.stopAutoplay();
    this.showProgressBar.set(true);
    this.autoplayInterval = setInterval(() => {
      this.nextSpreadsheetImage(true);
    }, 5000);
  }

  private stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
    }
  }

  private resetAutoplay() {
    this.stopAutoplay();
    this.showProgressBar.set(false);
    setTimeout(() => {
      this.startAutoplay();
    }, 50);
  }

  // Video player methods
  protected toggleVideoPlay(video: HTMLVideoElement) {
    if (video.paused) {
      video.play().then(() => this.isVideoPlaying.set(true)).catch(() => {});
    } else {
      video.pause();
      this.isVideoPlaying.set(false);
    }
  }

  protected toggleVideoMute(video: HTMLVideoElement, event?: Event) {
    if (event) event.stopPropagation();
    video.muted = !video.muted;
    this.isVideoMuted.set(video.muted);
  }

  protected onVideoTimeUpdate(video: HTMLVideoElement) {
    if (video.duration) {
      this.videoDuration.set(video.duration);
      this.videoCurrentTime.set(video.currentTime);
      this.videoProgress.set((video.currentTime / video.duration) * 100);
    }
  }

  protected onVideoSeek(event: Event, video: HTMLVideoElement) {
    const input = event.target as HTMLInputElement;
    const seekTime = (parseFloat(input.value) / 100) * video.duration;
    video.currentTime = seekTime;
    this.videoProgress.set(parseFloat(input.value));
  }

  protected formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds === 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  protected openContactModal(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    this.isContactModalOpen.set(true);
  }

  closeContactModal() {
    this.isContactModalOpen.set(false);
    this.whatsappForm.reset();
  }

  setSpreadsheetImage(index: number) {
    this.activeSpreadsheetImageIndex.set(index);
    this.markImageAsLoaded(index);
    this.resetAutoplay();
  }

  nextSpreadsheetImage(isAuto = false) {
    const currentIndex = this.activeSpreadsheetImageIndex();
    const nextIndex = (currentIndex + 1) % this.spreadsheetPages.length;
    this.activeSpreadsheetImageIndex.set(nextIndex);
    this.markImageAsLoaded(nextIndex);
    if (!isAuto) {
      this.resetAutoplay();
    } else {
      this.showProgressBar.set(false);
      setTimeout(() => {
        this.showProgressBar.set(true);
      }, 50);
    }
  }

  prevSpreadsheetImage() {
    const currentIndex = this.activeSpreadsheetImageIndex();
    const prevIndex = (currentIndex - 1 + this.spreadsheetPages.length) % this.spreadsheetPages.length;
    this.activeSpreadsheetImageIndex.set(prevIndex);
    this.markImageAsLoaded(prevIndex);
    this.resetAutoplay();
  }

  private markImageAsLoaded(index: number) {
    if (!this.loadedIndexes().includes(index)) {
      this.loadedIndexes.update(val => [...val, index]);
    }
  }

  // Mouse & Touch Drag Gestures for gallery swiping
  onDragStart(event: MouseEvent | TouchEvent) {
    this.isDragging = true;
    this.dragStartX = this.getXPosition(event);
    this.stopAutoplay();
  }

  onDragEnd(event: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;
    this.isDragging = false;

    const dragEndX = this.getXPosition(event);
    const diffX = dragEndX - this.dragStartX;

    // Threshold of 50px drag to change slides
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        this.prevSpreadsheetImage();
      } else {
        this.nextSpreadsheetImage();
      }
    } else {
      this.startAutoplay(); // resume autoplay if no drag change happened
    }
  }

  private getXPosition(event: MouseEvent | TouchEvent): number {
    if (event instanceof MouseEvent) {
      return event.clientX;
    }
    return event.changedTouches && event.changedTouches[0]
      ? event.changedTouches[0].clientX
      : 0;
  }


  // Dynamic Brazilian Phone Mask (e.g. (11) 99999-9999) applied as user types
  onWhatsappInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let rawValue = input.value.replace(/\D/g, ''); // Remove non-digits

    if (rawValue.length > 11) {
      rawValue = rawValue.substring(0, 11);
    }

    let formattedValue = '';
    if (rawValue.length > 0) {
      formattedValue = '(' + rawValue.substring(0, 2);
      if (rawValue.length > 2) {
        formattedValue += ') ' + rawValue.substring(2, 7);
        if (rawValue.length > 7) {
          formattedValue += '-' + rawValue.substring(7);
        }
      }
    }

    // Reformat for landline (10 digits) if length matches exactly
    if (rawValue.length === 10) {
      formattedValue = `(${rawValue.substring(0, 2)}) ${rawValue.substring(2, 6)}-${rawValue.substring(6)}`;
    }

    input.value = formattedValue;
    this.whatsappForm.get('whatsapp')?.setValue(formattedValue, { emitModelToViewChange: false });
  }

  // Phone input mask specifically for Section 1 form
  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let rawValue = input.value.replace(/\D/g, '');

    if (rawValue.length > 11) {
      rawValue = rawValue.substring(0, 11);
    }

    let formattedValue = '';
    if (rawValue.length > 0) {
      formattedValue = '(' + rawValue.substring(0, 2);
      if (rawValue.length > 2) {
        formattedValue += ') ' + rawValue.substring(2, 7);
        if (rawValue.length > 7) {
          formattedValue += '-' + rawValue.substring(7);
        }
      }
    }

    if (rawValue.length === 10) {
      formattedValue = `(${rawValue.substring(0, 2)}) ${rawValue.substring(2, 6)}-${rawValue.substring(6)}`;
    }

    input.value = formattedValue;
    this.emailForm.get('phone')?.setValue(formattedValue, { emitModelToViewChange: false });
  }

  onSubmitEmail() {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.isSubmittingEmail.set(true);

    const { name, email, phone } = this.emailForm.value;

    this.leadService.sendLead({ name, email, phone, type: 'email' }).subscribe({
      next: () => {
        localStorage.setItem('capturedLeadSpreadsheet', JSON.stringify({ name, email, phone }));
        this.isSubmittingEmail.set(false);
        this.submitEmailSuccess.set(true);

        setTimeout(() => {
          window.location.href = 'https://pay.kiwify.com.br/Hn4ldrV';
        }, 800);
      },
      error: (err) => {
        console.error('Error saving lead to database:', err);
        // Fallback: continue user flow anyway
        localStorage.setItem('capturedLeadSpreadsheet', JSON.stringify({ name, email, phone }));
        this.isSubmittingEmail.set(false);
        this.submitEmailSuccess.set(true);

        setTimeout(() => {
          window.location.href = 'https://pay.kiwify.com.br/Hn4ldrV';
        }, 800);
      }
    });
  }

  onSubmitWhatsapp() {
    if (this.whatsappForm.invalid) {
      this.whatsappForm.markAllAsTouched();
      return;
    }

    this.isSubmittingWhatsapp.set(true);

    const { name, whatsapp } = this.whatsappForm.value;

    this.leadService.sendLead({ name, phone: whatsapp, type: 'whatsapp' }).subscribe({
      next: () => {
        localStorage.setItem('capturedLeadWhatsapp', JSON.stringify({ name, whatsapp }));
        this.isSubmittingWhatsapp.set(false);
        this.submitWhatsappSuccess.set(true);

        setTimeout(() => {
          this.closeContactModal();
          this.submitWhatsappSuccess.set(false);
          const message = `Olá, professora Taissa! Me chamo ${name}, gostaria de agendar uma aula de inglês e tirar algumas dúvidas.`;
          window.location.href = `https://wa.me/+553799431598?text=${encodeURIComponent(message)}`;
        }, 1000);
      },
      error: (err) => {
        console.error('Error saving lead to database:', err);
        // Fallback: continue user flow anyway
        localStorage.setItem('capturedLeadWhatsapp', JSON.stringify({ name, whatsapp }));
        this.isSubmittingWhatsapp.set(false);
        this.submitWhatsappSuccess.set(true);

        setTimeout(() => {
          this.closeContactModal();
          this.submitWhatsappSuccess.set(false);
          const message = `Olá, professora Taissa! Me chamo ${name}, gostaria de agendar uma aula de inglês e tirar algumas dúvidas.`;
          window.location.href = `https://wa.me/+553799431598?text=${encodeURIComponent(message)}`;
        }, 1000);
      }
    });
  }
}

