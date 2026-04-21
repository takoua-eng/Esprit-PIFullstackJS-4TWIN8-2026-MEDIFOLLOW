import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';

export type VoiceLang = 'fr' | 'ar' | 'en';

export interface VoiceField {
  name: string;
  label: { fr: string; ar: string; en: string };
  type: 'number' | 'text' | 'checkbox' | 'radio';
  options?: string[];
  min?: number;
  max?: number;
  hint?: { fr: string; ar: string; en: string };
}

export interface FormRegistration {
  pageId: string;
  fields: VoiceField[];
  onFillField: (name: string, value: any) => void;
  onSubmit: () => void;
  onReadAlerts?: () => string[];
}

// --------------- Multilingual keyword map ---------------
const KEYWORDS = {
  symptoms:       ['symptôme', 'symptome', 'symptômes', 'symptomes', 'symptom', 'symptoms',
                   'أعراض', 'اعراض', 'عرض', 'علامات', 'عندي', 'الم', 'ألم', 'وجع'],
  vitals:         ['paramètre', 'parametre', 'paramètres', 'parametres', 'vital', 'vitals', 'mesure', 'mesures',
                   'معامل', 'مقياس', 'مقاييس', 'parameters', 'حيوية', 'العلامات', 'قياس', 'كياس', 'معدل',
                   'ضغط', 'حرارة', 'وزن', 'نبض'],
  alerts:         ['alerte', 'alertes', 'alert', 'alerts',
                   'تنبيه', 'تنبيهات', 'تحذير', 'تحذيرات', 'انذار', 'إنذار', 'انباه'],
  questionnaires: ['questionnaire', 'questionnaires', 'formulaire',
                   'استبيان', 'استبيانات', 'اسئلة', 'أسئلة', 'استفسار'],
  dashboard:      ['tableau de bord', 'accueil', 'dashboard', 'home',
                   'الرئيسية', 'لوح القيادة', 'البداية', 'الصفحة الرئيسية', 'رئيسية'],
  profile:        ['profil', 'profile', 'الملف الشخصي', 'ملفي', 'حسابي', 'بروفيل'],
  messages:       ['message', 'messages', 'رسالة', 'رسائل', 'مراسلة'],
  history:        ['historique', 'history', 'السجل', 'التاريخ', 'سجل', 'تاريخ'],
  save:           ['enregistrer', 'sauvegarder', 'valider', 'save', 'submit',
                   'حفظ', 'تسجيل', 'احفظ', 'خلص', 'انهيت', 'انتهيت', 'حفظت'],
  next:           ['suivant', 'prochain', 'continuer', 'next', 'continue',
                   'التالي', 'تالي', 'كمل', 'واصل'],
  yes:            ['oui', 'yes', 'نعم', 'أيوه', 'ouais', 'yep', 'ايه', 'إيه', 'اه', 'آه', 'يلا', 'بلى'],
  no:             ['non', 'no', 'لا', 'نو', 'ما', 'مش'],
  cancel:         ['annuler', 'cancel', 'retour', 'إلغاء', 'الغاء', 'رجوع', 'ارجع', 'وقف', 'ألغي'],
  repeat:         ['répéter', 'répète', 'repeter', 'repeat', 'encore', 'again',
                   'إعادة', 'اعادة', 'مرة أخرى', 'مرة ثانية', 'تكرار', 'كرر'],
  langFr:         ['français', 'french', 'en français', 'باللغة الفرنسية', 'فرنسي', 'فرنساوي'],
  langAr:         ['arabe', 'arabic', 'بالعربية', 'عربي', 'عربية'],
  langEn:         ['anglais', 'english', 'in english', 'بالإنجليزية', 'انجليزي', 'إنجليزي'],
  help:           ['aide', 'help', 'مساعدة', 'ماذا أفعل', 'que faire', 'ساعدني', 'ايش افعل', 'شو افعل'],
};

const GREETINGS: Record<VoiceLang, string> = {
  fr: 'Bonjour ! Je suis votre assistant vocal MediFollow. Dites-moi ce que vous voulez faire : symptômes, paramètres vitaux, questionnaires, alertes, ou messages.',
  ar: 'مرحباً! أنا مساعدك الصوتي في تطبيق ميديفولو. قل لي ماذا تريد أن تفعل: أعراض، مقاييس حيوية، استبيانات، تنبيهات، أو رسائل.',
  en: 'Hello! I am your MediFollow voice assistant. Tell me what you want to do: symptoms, vital parameters, questionnaires, alerts, or messages.',
};

const HELP_MSG: Record<VoiceLang, string> = {
  fr: 'Vous pouvez dire : symptômes, paramètres vitaux, questionnaires, alertes, messages, profil, ou tableau de bord.',
  ar: 'يمكنك قول: أعراض، مقاييس حيوية، استبيانات، تنبيهات، رسائل، الملف الشخصي، أو الرئيسية.',
  en: 'You can say: symptoms, vital parameters, questionnaires, alerts, messages, profile, or dashboard.',
};

const NAV_CONFIRM: Record<string, Record<VoiceLang, string>> = {
  symptoms:       { fr: 'Ouverture de la page des symptômes.',             ar: 'فتح صفحة الأعراض.',              en: 'Opening the symptoms page.' },
  vitals:         { fr: 'Ouverture de la page des paramètres vitaux.',     ar: 'فتح صفحة المقاييس الحيوية.',     en: 'Opening the vital parameters page.' },
  alerts:         { fr: 'Ouverture de la page des alertes.',               ar: 'فتح صفحة التنبيهات.',             en: 'Opening the alerts page.' },
  questionnaires: { fr: 'Ouverture de la page des questionnaires.',        ar: 'فتح صفحة الاستبيانات.',           en: 'Opening the questionnaires page.' },
  dashboard:      { fr: 'Retour au tableau de bord.',                      ar: 'الرجوع إلى الرئيسية.',            en: 'Going to the dashboard.' },
  profile:        { fr: 'Ouverture de votre profil.',                      ar: 'فتح ملفك الشخصي.',               en: 'Opening your profile.' },
  messages:       { fr: 'Ouverture de vos messages.',                      ar: 'فتح رسائلك.',                    en: 'Opening your messages.' },
  history:        { fr: 'Ouverture de votre historique.',                  ar: 'فتح سجلك الطبي.',                en: 'Opening your history.' },
};

const FORM_OFFER: Record<VoiceLang, string> = {
  fr: 'Voulez-vous remplir le formulaire maintenant ?',
  ar: 'هل تريد ملء النموذج الآن؟',
  en: 'Would you like to fill in the form now?',
};

const FORM_START: Record<VoiceLang, string> = {
  fr: 'Bien. Je vais vous guider champ par champ.',
  ar: 'حسناً. سأرشدك حقلاً بحقل.',
  en: 'Alright. I will guide you field by field.',
};

const FIELD_CONFIRM: Record<VoiceLang, string> = {
  fr: "J'ai noté",
  ar: 'تم تسجيل',
  en: 'Got it',
};

const FORM_DONE_ASK: Record<VoiceLang, string> = {
  fr: 'Tous les champs sont remplis. Dites sauvegarder pour enregistrer ou annuler pour recommencer.',
  ar: 'تم ملء جميع الحقول. قل حفظ للتسجيل أو إلغاء للبدء من جديد.',
  en: 'All fields are filled. Say save to submit or cancel to restart.',
};

const FORM_SAVED: Record<VoiceLang, string> = {
  fr: 'Données enregistrées avec succès !',
  ar: 'تم حفظ البيانات بنجاح!',
  en: 'Data saved successfully!',
};

const FORM_CANCELLED: Record<VoiceLang, string> = {
  fr: 'Formulaire réinitialisé.',
  ar: 'تم إعادة تعيين النموذج.',
  en: 'Form reset.',
};

const LISTEN_MSG: Record<VoiceLang, string> = {
  fr: "Je vous écoute...",
  ar: 'أنا أسمعك...',
  en: 'Listening...',
};

const ASK_FOR_FIELD: Record<VoiceLang, (label: string, hint?: string) => string> = {
  fr: (label, hint) => hint ? `${label}. ${hint}` : label,
  ar: (label, hint) => hint ? `${label}. ${hint}` : label,
  en: (label, hint) => hint ? `${label}. ${hint}` : label,
};

const INVALID_VALUE: Record<VoiceLang, string> = {
  fr: "Je n'ai pas compris. Pouvez-vous répéter ?",
  ar: 'لم أفهم. هل يمكنك الإعادة؟',
  en: "I didn't understand. Could you repeat?",
};

const READING_ALERTS: Record<VoiceLang, string> = {
  fr: 'Voici vos alertes :',
  ar: 'إليك تنبيهاتك:',
  en: 'Here are your alerts:',
};

const NO_ALERTS: Record<VoiceLang, string> = {
  fr: 'Vous n\'avez aucune alerte pour le moment.',
  ar: 'ليس لديك أي تنبيهات حالياً.',
  en: 'You have no alerts at the moment.',
};

const STT_LANGS: Record<VoiceLang, string[]> = {
  fr: ['fr-FR', 'fr-BE', 'fr-CA'],
  ar: ['ar-SA', 'ar-EG', 'ar-MA', 'ar'],
  en: ['en-US', 'en-GB'],
};

/** BCP-47 tag used for TTS voice selection */
const TTS_LANG_PREFIX: Record<VoiceLang, string> = { fr: 'fr', ar: 'ar', en: 'en' };

@Injectable({ providedIn: 'root' })
export class VoiceAssistantService implements OnDestroy {

  /** Whether the voice assistant is globally enabled */
  isEnabled$ = new BehaviorSubject<boolean>(false);

  /** Current detected/chosen language */
  lang$ = new BehaviorSubject<VoiceLang>('fr');

  /** What the assistant is currently saying (for display) */
  assistantText$ = new BehaviorSubject<string>('');

  /** What the user said (for display) */
  userText$ = new BehaviorSubject<string>('');

  /** Whether microphone is active */
  isListening$ = new BehaviorSubject<boolean>(false);

  /** Whether assistant is speaking */
  isSpeaking$ = new BehaviorSubject<boolean>(false);

  private recognition: any = null;
  private registeredForm: FormRegistration | null = null;
  private formFillingMode = false;
  private currentFieldIndex = -1;
  private waitingForFormOffer = false;
  private waitingForSaveConfirm = false;
  /** Tracks which STT locale fallback index we are using per language */
  private sttLangIndex = 0;

  get lang(): VoiceLang { return this.lang$.value; }

  constructor(private router: Router, private ngZone: NgZone) {}

  // ──────────────── Public API ────────────────

  enable(): void {
    this.isEnabled$.next(true);
    setTimeout(() => this.greet(), 400);
  }

  disable(): void {
    this.stopListening();
    this.stopSpeaking();
    this.resetFormState();
    this.isEnabled$.next(false);
    this.assistantText$.next('');
    this.userText$.next('');
  }

  toggle(): void {
    if (this.isEnabled$.value) { this.disable(); } else { this.enable(); }
  }

  setLanguage(lang: VoiceLang): void {
    this.sttLangIndex = 0; // Reset fallback index when language changes
    this.lang$.next(lang);
    if (this.recognition) {
      this.recognition.lang = STT_LANGS[lang][0];
    }
  }

  /**
   * Called by each patient page that supports voice.
   * The page passes its fields and callback functions.
   */
  registerForm(reg: FormRegistration): void {
    this.registeredForm = reg;
    this.resetFormState();
  }

  unregisterForm(): void {
    this.registeredForm = null;
    this.resetFormState();
  }

  /** Called by assistant component to start a listening cycle */
  startListening(): void {
    if (!this.isEnabled$.value) return;
    this.initRecognition();
    try {
      this.recognition?.start();
    } catch (_) { /* already running */ }
  }

  stopListening(): void {
    try { this.recognition?.stop(); } catch (_) {}
    this.isListening$.next(false);
  }

  // ──────────────── Greeting ────────────────

  greet(): void {
    this.speak(GREETINGS[this.lang], () => this.startListening());
  }

  // ──────────────── Speech Synthesis ────────────────

  speak(text: string, onEnd?: () => void): void {
    if (!('speechSynthesis' in window)) return;
    this.stopSpeaking();
    this.assistantText$.next(text);
    this.isSpeaking$.next(true);

    const doSpeak = () => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = STT_LANGS[this.lang][0];
      utter.rate = this.lang === 'ar' ? 0.85 : 0.95;
      utter.pitch = 1.0;

      // Try to select a matching voice (skip if none found – let browser choose)
      if (this.lang === 'ar') {
        const arVoice = window.speechSynthesis.getVoices().find(
          v => v.lang.startsWith('ar') || v.name.toLowerCase().includes('arabic')
             || v.name.toLowerCase().includes('naayf') || v.name.toLowerCase().includes('hoda')
        );
        if (arVoice) { utter.voice = arVoice; }
        // If no Arabic voice: don't assign, browser will use default (may be silent on some systems)
      } else {
        const prefix = TTS_LANG_PREFIX[this.lang];
        const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith(prefix));
        if (v) { utter.voice = v; }
      }

      utter.onend = () => { this.ngZone.run(() => { this.isSpeaking$.next(false); onEnd?.(); }); };
      utter.onerror = () => { this.ngZone.run(() => { this.isSpeaking$.next(false); onEnd?.(); }); };
      window.speechSynthesis.speak(utter);
    };

    // Voices may not be loaded yet on first call
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
    } else {
      doSpeak();
    }
  }

  stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking$.next(false);
  }

  // ──────────────── STT Initialisation ────────────────

  private initRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (this.recognition) {
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      try { this.recognition.abort(); } catch (_) {}
    }

    this.recognition = new SpeechRecognition();
    // Use the tracked fallback index (not always [0])
    const locales = STT_LANGS[this.lang];
    this.recognition.lang = locales[Math.min(this.sttLangIndex, locales.length - 1)];
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 5;
    this.recognition.continuous = false;

    this.recognition.onstart = () => {
      this.ngZone.run(() => {
        this.isListening$.next(true);
        this.userText$.next(LISTEN_MSG[this.lang]);
      });
    };

    this.recognition.onresult = (event: any) => {
      this.ngZone.run(() => {
        // Take best alternative
        let transcript = event.results[0][0].transcript;
        for (let i = 1; i < event.results[0].length; i++) {
          if (event.results[0][i].confidence > event.results[0][0].confidence) {
            transcript = event.results[0][i].transcript;
          }
        }
        transcript = this.normalizeText(transcript);
        this.userText$.next(transcript);
        this.isListening$.next(false);
        this.handleTranscript(transcript);
      });
    };

    // Fallback: try next locale when language-not-supported (uses service-level index)
    this.recognition.onerror = (event: any) => {
      this.ngZone.run(() => {
        this.isListening$.next(false);
        if (event.error === 'language-not-supported') {
          const fallbacks = STT_LANGS[this.lang];
          if (this.sttLangIndex < fallbacks.length - 1) {
            this.sttLangIndex++;
            // Re-init with next locale and retry
            setTimeout(() => { if (this.isEnabled$.value) this.startListening(); }, 300);
          }
          // else: no more fallbacks available, silently stop
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setTimeout(() => { if (this.isEnabled$.value) this.startListening(); }, 1500);
        }
      });
    };

    this.recognition.onend = () => {
      this.ngZone.run(() => {
        this.isListening$.next(false);
      });
    };
  }

  // ──────────────── Command Interpreter ────────────────

  private handleTranscript(text: string): void {
    // Language switch commands
    if (this.matchesAny(text, KEYWORDS.langFr)) { this.setLanguage('fr'); this.speak('Langue changée en français.', () => this.startListening()); return; }
    if (this.matchesAny(text, KEYWORDS.langAr)) { this.setLanguage('ar'); this.speak('تم تغيير اللغة إلى العربية.', () => this.startListening()); return; }
    if (this.matchesAny(text, KEYWORDS.langEn)) { this.setLanguage('en'); this.speak('Language changed to English.', () => this.startListening()); return; }

    // If in form filling mode → handle form input
    if (this.formFillingMode && this.currentFieldIndex >= 0) {
      this.handleFormInput(text);
      return;
    }

    // If waiting for "do you want to fill the form?"
    if (this.waitingForFormOffer) {
      this.handleFormOfferReply(text);
      return;
    }

    // If waiting for save/cancel after form done
    if (this.waitingForSaveConfirm) {
      this.handleSaveConfirmReply(text);
      return;
    }

    // Help
    if (this.matchesAny(text, KEYWORDS.help)) {
      this.speak(HELP_MSG[this.lang], () => this.startListening());
      return;
    }

    // Repeat / re-read
    if (this.matchesAny(text, KEYWORDS.repeat)) {
      const current = this.assistantText$.value;
      this.speak(current, () => this.startListening());
      return;
    }

    // Navigation commands
    if (this.matchesAny(text, KEYWORDS.symptoms))       { this.navigateTo('symptoms');       return; }
    if (this.matchesAny(text, KEYWORDS.vitals))         { this.navigateTo('vitals');         return; }
    if (this.matchesAny(text, KEYWORDS.alerts))         { this.navigateTo('alerts');         return; }
    if (this.matchesAny(text, KEYWORDS.questionnaires)) { this.navigateTo('questionnaires'); return; }
    if (this.matchesAny(text, KEYWORDS.dashboard))      { this.navigateTo('dashboard');      return; }
    if (this.matchesAny(text, KEYWORDS.profile))        { this.navigateTo('profile');        return; }
    if (this.matchesAny(text, KEYWORDS.messages))       { this.navigateTo('messages');       return; }
    if (this.matchesAny(text, KEYWORDS.history))        { this.navigateTo('history');        return; }

    // Not understood – repeat question or greet again
    this.speak(INVALID_VALUE[this.lang], () => this.startListening());
  }

  // ──────────────── Navigation ────────────────

  private navigateTo(page: string): void {
    const routes: Record<string, string> = {
      symptoms:       '/dashboard/patient/symptoms',
      vitals:         '/dashboard/patient/parameters',
      alerts:         '/dashboard/patient/alerts',
      questionnaires: '/dashboard/patient/questionnaires',
      dashboard:      '/dashboard/patient',
      profile:        '/dashboard/patient/profile',
      messages:       '/dashboard/patient/messages',
      history:        '/dashboard/patient/history',
    };

    const confirmMsg = NAV_CONFIRM[page]?.[this.lang] || NAV_CONFIRM['dashboard'][this.lang];

    this.speak(confirmMsg, () => {
      this.router.navigate([routes[page] || '/dashboard/patient']).then(() => {
        // After navigation the page ngOnInit will call registerForm()
        // We then offer to fill the form (except for alerts & dashboard)
        setTimeout(() => {
          if (page === 'alerts') {
            // Reading alerts is handled after we receive registration from alerts page
            this.startListening();
          } else if (page !== 'dashboard' && page !== 'profile' && page !== 'messages' && page !== 'history') {
            this.waitingForFormOffer = true;
            this.speak(FORM_OFFER[this.lang], () => this.startListening());
          } else {
            this.startListening();
          }
        }, 600);
      });
    });
  }

  // ──────────────── Form offer reply ────────────────

  private handleFormOfferReply(text: string): void {
    this.waitingForFormOffer = false;
    if (this.matchesAny(text, KEYWORDS.yes)) {
      if (!this.registeredForm) {
        // Form not yet registered – try briefly later
        setTimeout(() => {
          if (this.registeredForm) {
            this.startFormFilling();
          } else {
            this.speak(INVALID_VALUE[this.lang], () => this.startListening());
          }
        }, 800);
      } else {
        this.startFormFilling();
      }
    } else if (this.matchesAny(text, KEYWORDS.no) || this.matchesAny(text, KEYWORDS.cancel)) {
      this.speak(HELP_MSG[this.lang], () => this.startListening());
    } else {
      // Treat as positive
      this.startFormFilling();
    }
  }

  // ──────────────── Form Filling ────────────────

  private startFormFilling(): void {
    if (!this.registeredForm) return;
    this.formFillingMode = true;
    this.currentFieldIndex = -1;
    this.speak(FORM_START[this.lang], () => this.askNextField());
  }

  private askNextField(): void {
    if (!this.registeredForm) return;
    this.currentFieldIndex++;

    if (this.currentFieldIndex >= this.registeredForm.fields.length) {
      // All fields done
      this.formFillingMode = false;
      this.waitingForSaveConfirm = true;
      this.speak(FORM_DONE_ASK[this.lang], () => this.startListening());
      return;
    }

    const field = this.registeredForm.fields[this.currentFieldIndex];
    const label = field.label[this.lang];
    const hint = field.hint?.[this.lang];
    const question = ASK_FOR_FIELD[this.lang](label, hint);
    this.speak(question, () => this.startListening());
  }

  private handleFormInput(text: string): void {
    if (!this.registeredForm) return;
    const field = this.registeredForm.fields[this.currentFieldIndex];

    // Handle repeat request
    if (this.matchesAny(text, KEYWORDS.repeat)) {
      const label = field.label[this.lang];
      const hint = field.hint?.[this.lang];
      this.speak(ASK_FOR_FIELD[this.lang](label, hint), () => this.startListening());
      return;
    }

    // Handle "next" or "skip" for optional fields
    if (this.matchesAny(text, KEYWORDS.next)) {
      this.askNextField();
      return;
    }

    // Handle "cancel"
    if (this.matchesAny(text, KEYWORDS.cancel)) {
      this.resetFormState();
      this.speak(FORM_CANCELLED[this.lang], () => this.startListening());
      return;
    }

    let parsedValue: any = text;

    if (field.type === 'number') {
      const num = this.parseNumber(text);
      if (num === null) {
        this.speak(INVALID_VALUE[this.lang], () => this.startListening());
        return;
      }
      if (field.min !== undefined && num < field.min!) {
        const msg = this.lang === 'fr' ? `La valeur minimale est ${field.min}.` :
                    this.lang === 'ar' ? `الحد الأدنى هو ${field.min}.` :
                    `The minimum value is ${field.min}.`;
        this.speak(msg, () => this.startListening());
        return;
      }
      if (field.max !== undefined && num > field.max!) {
        const msg = this.lang === 'fr' ? `La valeur maximale est ${field.max}.` :
                    this.lang === 'ar' ? `الحد الأقصى هو ${field.max}.` :
                    `The maximum value is ${field.max}.`;
        this.speak(msg, () => this.startListening());
        return;
      }
      parsedValue = num;
    } else if (field.type === 'checkbox') {
      parsedValue = this.matchesAny(text, KEYWORDS.yes) || text.includes('vrai') || text.includes('true');
    } else if (field.type === 'radio' && field.options) {
      const matched = field.options.find(o => text.includes(o.toLowerCase()));
      if (matched) { parsedValue = matched; }
    }

    // Fill the field
    this.registeredForm.onFillField(field.name, parsedValue);

    const confirmMsg = `${FIELD_CONFIRM[this.lang]} : ${field.label[this.lang]} = ${parsedValue}.`;
    this.speak(confirmMsg, () => this.askNextField());
  }

  // ──────────────── Save / Cancel ────────────────

  private handleSaveConfirmReply(text: string): void {
    this.waitingForSaveConfirm = false;
    if (this.matchesAny(text, KEYWORDS.save) || this.matchesAny(text, KEYWORDS.yes)) {
      this.registeredForm?.onSubmit();
      this.speak(FORM_SAVED[this.lang], () => this.startListening());
    } else if (this.matchesAny(text, KEYWORDS.cancel) || this.matchesAny(text, KEYWORDS.no)) {
      this.speak(FORM_CANCELLED[this.lang], () => this.startListening());
    } else {
      this.waitingForSaveConfirm = true;
      this.speak(FORM_DONE_ASK[this.lang], () => this.startListening());
    }
  }

  // ──────────────── Alert reading (called by AlertsComponent) ────────────────

  readAlerts(alerts: { message: string; status: string }[]): void {
    if (!alerts.length) {
      this.speak(NO_ALERTS[this.lang], () => this.startListening());
      return;
    }

    const prefix = READING_ALERTS[this.lang];
    const statusWord = (s: string) => {
      if (this.lang === 'fr') return s === 'pending' ? 'en attente' : 'résolue';
      if (this.lang === 'ar') return s === 'pending' ? 'معلقة' : 'محلولة';
      return s === 'pending' ? 'pending' : 'resolved';
    };

    const lines = alerts.map((a, i) => `${i + 1}. ${a.message}. ${statusWord(a.status)}.`).join(' ');
    this.speak(`${prefix} ${lines}`, () => this.startListening());
  }

  // ──────────────── Arabic/text normalisation ────────────────

  /**
   * Normalise Arabic text for robust keyword matching:
   * - lowercase
   * - remove diacritics (tashkeel)
   * - unify alef variants (أ إ آ ا → ا)
   * - unify ya/alef maqsura (ى → ي)
   * - unify tah marbuta (ة → ه)
   */
  private normalizeText(text: string): string {
    return text
      .trim()
      .toLowerCase()
      // Remove Arabic diacritics (tashkeel: U+064B–U+065F, U+0610–U+061A)
      .replace(/[\u064B-\u065F\u0610-\u061A]/g, '')
      // Normalize alef variants → bare alef
      .replace(/[أإآٱ]/g, 'ا')
      // Normalize ya variants
      .replace(/ى/g, 'ي')
      // Normalize tah marbuta
      .replace(/ة/g, 'ه');
  }

  // ──────────────── Helpers ────────────────

  private matchesAny(text: string, keywords: string[]): boolean {
    const normalizedText = this.normalizeText(text);
    return keywords.some(k => normalizedText.includes(this.normalizeText(k)));
  }

  private parseNumber(text: string): number | null {
    // Try direct parse
    const direct = parseFloat(text.replace(',', '.'));
    if (!isNaN(direct)) return direct;

    // French number words
    const wordMap: Record<string, number> = {
      'zéro': 0, 'zero': 0, 'صفر': 0,
      'un': 1, 'une': 1, 'one': 1, 'واحد': 1,
      'deux': 2, 'two': 2, 'اثنان': 2, 'اثنين': 2,
      'trois': 3, 'three': 3, 'ثلاثة': 3, 'ثلاث': 3,
      'quatre': 4, 'four': 4, 'أربعة': 4, 'أربع': 4,
      'cinq': 5, 'five': 5, 'خمسة': 5, 'خمس': 5,
      'six': 6, 'ستة': 6, 'ست': 6,
      'sept': 7, 'seven': 7, 'سبعة': 7, 'سبع': 7,
      'huit': 8, 'eight': 8, 'ثمانية': 8, 'ثماني': 8,
      'neuf': 9, 'nine': 9, 'تسعة': 9, 'تسع': 9,
      'dix': 10, 'ten': 10, 'عشرة': 10, 'عشر': 10,
      'trente': 30, 'thirty': 30, 'ثلاثون': 30,
      'quarante': 40, 'forty': 40, 'أربعون': 40,
      'cinquante': 50, 'fifty': 50, 'خمسون': 50,
      'soixante': 60, 'sixty': 60, 'ستون': 60,
      'soixante-dix': 70, 'seventy': 70, 'سبعون': 70,
      'quatre-vingts': 80, 'eighty': 80, 'ثمانون': 80,
      'quatre-vingt-dix': 90, 'ninety': 90, 'تسعون': 90,
      'cent': 100, 'hundred': 100, 'مئة': 100,
    };
    for (const [word, val] of Object.entries(wordMap)) {
      if (text.includes(word)) return val;
    }

    // Extract first number from string
    const match = text.match(/\d+([.,]\d+)?/);
    if (match) return parseFloat(match[0].replace(',', '.'));

    return null;
  }

  private resetFormState(): void {
    this.formFillingMode = false;
    this.currentFieldIndex = -1;
    this.waitingForFormOffer = false;
    this.waitingForSaveConfirm = false;
  }

  ngOnDestroy(): void {
    this.stopListening();
    this.stopSpeaking();
  }
}
