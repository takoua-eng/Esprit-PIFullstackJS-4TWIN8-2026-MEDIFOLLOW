import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService, PatientContext } from 'src/app/services/ai.service';
import { PatientService, VitalEntry, SymptomEntry } from 'src/app/services/patient.service';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';

export interface ChatMessage {
  sender: 'patient' | 'bot';
  text: string;
  timestamp: Date;
  isUrgent?: boolean;
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.scss',
})
export class AiChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  userInput = '';
  isLoading = false;
  patientContext: PatientContext = {};
  patientName = '';

  private URGENT_KEYWORDS = [
    'douleur poitrine', 'thoracique', 'essoufflement', 'difficultés respiratoires',
    'perte de connaissance', 'inconscient', 'saignement abondant', 'accident',
    'paralysie', 'infarctus', 'avc', 'convulsion', 'urgence',
  ];

  constructor(
    private aiService: AiService,
    private patientService: PatientService,
  ) {}

  ngOnInit(): void {
    this.loadPatientData();
    this.messages.push({
      sender: 'bot',
      text: '👋 Bonjour ! Je suis MediBot, votre assistant santé. Décrivez-moi vos symptômes ou posez-moi une question. Je suis là pour vous aider ! 😊',
      timestamp: new Date(),
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private loadPatientData(): void {
    // Load patient name from localStorage
    const raw = localStorage.getItem('medi_follow_user_data');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        this.patientName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
        if (this.patientName) this.patientContext.name = this.patientName;
      } catch {}
    }

    // Load latest vitals + recent symptoms for context
    forkJoin({
      latestVital: this.patientService.getLatestVital().pipe(catchError(() => of(null))),
      symptoms: this.patientService.getMySymptoms().pipe(catchError(() => of([]))),
    }).subscribe(({ latestVital, symptoms }) => {
      if (latestVital) {
        this.patientContext.latestVitals = {
          temperature: (latestVital as VitalEntry).temperature,
          heartRate: (latestVital as VitalEntry).heartRate,
          bloodPressureSystolic: (latestVital as VitalEntry).bloodPressuresystolic,
          bloodPressureDiastolic: (latestVital as VitalEntry).bloodPressureDiastolic,
          weight: (latestVital as VitalEntry).weight,
        };
      }
      const arr = symptoms as SymptomEntry[];
      if (arr && arr.length > 0) {
        const latest = arr[arr.length - 1];
        this.patientContext.recentSymptoms = {
          symptoms: latest.symptoms,
          painLevel: latest.painLevel,
          fatigueLevel: latest.fatigueLevel,
          description: latest.description,
        };
      }
    });
  }

  send(): void {
    const msg = this.userInput.trim();
    if (!msg || this.isLoading) return;

    const isUrgent = this.checkUrgency(msg);

    this.messages.push({ sender: 'patient', text: msg, timestamp: new Date() });
    this.userInput = '';
    this.isLoading = true;

    if (isUrgent) {
      this.messages.push({
        sender: 'bot',
        text: '🚨 URGENCE — Vos symptômes peuvent être graves. Appelez immédiatement le 15 (SAMU) ou rendez-vous aux urgences les plus proches !',
        timestamp: new Date(),
        isUrgent: true,
      });
      this.isLoading = false;
      return;
    }

    this.aiService.sendMessage(msg, this.patientContext).subscribe({
      next: (res) => {
        this.messages.push({ sender: 'bot', text: res.response, timestamp: new Date() });
        this.isLoading = false;
      },
      error: () => {
        this.messages.push({
          sender: 'bot',
          text: "Désolé, je n'arrive pas à répondre pour le moment. Veuillez réessayer dans quelques instants.",
          timestamp: new Date(),
        });
        this.isLoading = false;
      },
    });
  }

  sendUrgency(): void {
    this.messages.push({
      sender: 'bot',
      text: '🚨 URGENCE — Appelez le 15 (SAMU) immédiatement ou demandez à quelqu\'un de vous amener aux urgences. Ne tardez pas !',
      timestamp: new Date(),
      isUrgent: true,
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  clearChat(): void {
    this.messages = [{
      sender: 'bot',
      text: '👋 Bonjour ! Je suis MediBot, votre assistant santé. Comment puis-je vous aider ?',
      timestamp: new Date(),
    }];
  }

  private checkUrgency(msg: string): boolean {
    const lower = msg.toLowerCase();
    return this.URGENT_KEYWORDS.some(kw => lower.includes(kw));
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
