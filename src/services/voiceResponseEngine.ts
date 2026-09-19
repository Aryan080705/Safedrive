// ------------------------------------------------------------------
// SafeDrive Voice Response Engine - Bilingual Hinglish & English Logic
// ------------------------------------------------------------------

import type { AssistantLanguage } from '../types';

export interface ResponseEvaluation {
  action: 'CONTINUE' | 'SKIP' | 'DECLINE' | 'UNCERTAIN';
  extractedValue: string;
  spokenReply: string;
}

export interface RoadContextData {
  speedKmH?: number;
  roadScore?: number;
  roadTier?: string;
  driverScore?: number;
  nearestBlackspotName?: string;
  nearestBlackspotDistanceKm?: number;
}

export class VoiceResponseEngine {
  /**
   * Evaluates special real-time road queries (Status, Speed, Blackspot, Mute, Emergency)
   */
  public static checkRoadIntent(
    rawSpeech: string,
    context: RoadContextData = {},
    _lang: AssistantLanguage = 'ENGLISH'
  ): { isHandled: boolean; reply: string; action?: 'STATUS' | 'SPEED' | 'BLACKSPOT' | 'MUTE' | 'EMERGENCY' } {
    const lower = rawSpeech.toLowerCase().trim();
    const speed = Math.round(context.speedKmH ?? 55);
    const tier = context.roadTier || 'LOW';

    // 1. Mute / Stop / Dismiss Intent
    const mutePatterns = [
      'mute', 'chup', 'shant', 'quiet', 'stop', 'band karo', 'exit', 'cancel', 'dismiss',
      'shut up', 'pause', 'be quiet', 'stop talking', 'hush', 'band ho jao', 'silent', 'close assistant'
    ];
    if (mutePatterns.some((p) => lower.includes(p))) {
      return {
        isHandled: true,
        action: 'MUTE',
        reply: "Voice assistant standing down. Ride safe!",
      };
    }

    // 2. Status / Safety Check Intent
    const statusPatterns = [
      'status', 'report', 'all good', 'how are things', 'risk level', 'safety check',
      'systems check', 'how is my driving', 'how am i driving', 'driver status', 'safety status',
      'check status', 'kaisa chal raha hai', 'sab theek hai', 'system status', 'status update'
    ];
    if (statusPatterns.some((p) => lower.includes(p))) {
      return {
        isHandled: true,
        action: 'STATUS',
        reply: `All clear. Speed is ${speed} km/h, road risk tier is ${tier}, sensors nominal.`,
      };
    }

    // 3. Speed Check Intent
    const speedPatterns = [
      'speed', 'how fast', 'speed check', 'current speed', 'what is my speed',
      'how fast am i going', 'kitni speed hai', 'gadi ki speed', 'check speed'
    ];
    if (speedPatterns.some((p) => lower.includes(p))) {
      return {
        isHandled: true,
        action: 'SPEED',
        reply: `Current speed is ${speed} km/h. Keep safe following distance.`,
      };
    }

    // 4. Blackspot / Danger Zone Intent
    const blackspotPatterns = [
      'blackspot', 'hotspot', 'danger zone', 'hazard', 'accident zone',
      'nearest danger', 'nearest accident', 'nearest blackspot', 'ahead danger',
      'road risk', 'danger ahead', 'accident spot', 'khatra'
    ];
    if (blackspotPatterns.some((p) => lower.includes(p))) {
      const spot = context.nearestBlackspotName || 'Noida Expressway Flyover';
      const dist = context.nearestBlackspotDistanceKm || 1.2;
      return {
        isHandled: true,
        action: 'BLACKSPOT',
        reply: `Nearest blackspot is ${spot}, ${dist} kilometers ahead. Drive carefully.`,
      };
    }

    // 5. Emergency / Help Intent
    const emergencyPatterns = [
      'emergency', 'help', 'crash', 'accident', 'sos', 'mayday',
      'call ambulance', 'call police', 'i need help', 'madad', 'bachao'
    ];
    if (emergencyPatterns.some((p) => lower.includes(p))) {
      return {
        isHandled: true,
        action: 'EMERGENCY',
        reply: "Emergency protocol standing by. Pull over safely, SOS dispatch is ready.",
      };
    }

    return { isHandled: false, reply: '' };
  }

  /**
   * Prompts for each question based on selected language
   */
  public static getPrompt(
    questionKey: 'INVITATION' | 'SCHOOL' | 'CRUSH' | 'HELMET_SING' | 'CHAI_CRAVING' | 'PET_PEEVE' | 'PASSION' | 'CLOSING',
    _lang: AssistantLanguage = 'ENGLISH'
  ): string {
    switch (questionKey) {
      case 'INVITATION':
        return "Hey! We've been riding together for a bit. Want to talk for a minute to keep you awake and engaged?";

      case 'SCHOOL':
        return "Which school did you go to? Were you a front-bencher or a back-bench troublemaker?";

      case 'CRUSH':
        return "Alright, spill it... who was your school crush? Don't worry, secrets are safe here.";

      case 'HELMET_SING':
        return "Rider confession time: Do you scream songs inside your helmet when nobody's watching?";

      case 'CHAI_CRAVING':
        return "Late night debate: Roadside tapri chai with bun maska, or 2 AM Maggi?";

      case 'PET_PEEVE':
        return "What annoys you most on the road? High-beam blinders or zero-indicator turns?";

      case 'PASSION':
        return "Besides riding, what's one thing you're really passionate about?";

      case 'CLOSING':
        return "Awesome! Loved getting to know your rider vibes. Safety sensors active, stay safe and enjoy the ride!";
    }
  }

  /**
   * Quick chip suggestions for user interactions in the HUD
   */
  public static getQuickSuggestions(
    questionKey: string,
    _lang: AssistantLanguage = 'ENGLISH'
  ): string[] {
    switch (questionKey) {
      case 'WAITING_FOR_ACCEPTANCE':
        return ["Yes, let's talk", 'Status check', 'Not now'];
      case 'LISTENING_SCHOOL':
        return ['Public High School', 'Back-bencher 😄', 'Skip'];
      case 'LISTENING_CRUSH':
        return ['Top Secret 🤫', 'Nobody (Single)', 'Skip'];
      case 'LISTENING_HELMET_SING':
        return ['Yes, full volume 🎤', 'No, quiet rider', 'Skip'];
      case 'LISTENING_CHAI_CRAVING':
        return ['Steaming Chai ☕', 'Midnight Maggi 🍜', 'Both!'];
      case 'LISTENING_PET_PEEVE':
        return ['High-beam blinders 💥', 'No-indicator turns', 'Tailgaters'];
      case 'LISTENING_PASSION':
        return ['Coding & Tech 💻', 'Motorcycles 🏍️', 'Music 🎸'];
      default:
        return ['Status check', 'Speed check', 'Nearest hotspot'];
    }
  }

  /**
   * Evaluates rider's voice acceptance to chat
   * Accepts both Hindi/Hinglish/Devanagari ("Haan", "हाँ", "Bilkool", "Kyu nahi") and English ("Yeah", "Yes")
   */
  public static evaluateAcceptance(rawSpeech: string, lang: AssistantLanguage = 'ENGLISH'): ResponseEvaluation {
    const text = rawSpeech.toLowerCase().trim();
    const isHinglish = lang === 'HINGLISH';

    if (!text || text.length === 0) {
      return {
        action: 'UNCERTAIN',
        extractedValue: '',
        spokenReply: isHinglish
          ? "Awaaz thodi cut gayi dost. Baat karni ho toh Haan bolo, ya No bolke skip kar sakte ho."
          : "Sorry, I didn't catch that. Say yeah if you'd like to chat, or no to skip.",
      };
    }

    const affirmativePatterns = [
      'yeah',
      'yes',
      'sure',
      'ok',
      'okay',
      'yup',
      'haan',
      'ha',
      'haa',
      'han',
      'yep',
      'bilkul',
      'bilkool',
      'kyu nahi',
      'bolo',
      'sunao',
      'definitely',
      'why not',
      'go ahead',
      'let do it',
      'alright',
      'cool',
      'chalo',
      'हाँ',
      'हां',
      'हा',
      'बिल्कुल',
      'बोलो',
      'सुनाओ',
      'चलो',
      'जरूर',
      'ज़रूर',
      'क्यों नहीं',
    ];

    const negativePatterns = [
      'no',
      'nah',
      'nope',
      'nahi',
      'nhi',
      'na',
      'baad mein',
      'chodo',
      'mat bolo',
      'later',
      'not now',
      'busy',
      'stop',
      'cancel',
      'riding',
      'driving',
      'नहीं',
      'ना',
      'मत',
      'बाद में',
      'छोड़ो',
      'बंद',
    ];

    for (const neg of negativePatterns) {
      if (text.includes(neg)) {
        return {
          action: 'DECLINE',
          extractedValue: 'declined',
          spokenReply: isHinglish
            ? "Koi baat nahi dost! Araam se ride karo, safety alerts active hain."
            : "No worries at all. Keeping the line clear for your ride. Drive safe!",
        };
      }
    }

    for (const aff of affirmativePatterns) {
      if (text.includes(aff)) {
        return {
          action: 'CONTINUE',
          extractedValue: 'accepted',
          spokenReply: isHinglish
            ? "Badiya! Ek simple sawaal se shuru karte hain."
            : "Awesome! Let's start with an easy one.",
        };
      }
    }

    // Default assume friendly continuation if they spoke words without saying no
    return {
      action: 'CONTINUE',
      extractedValue: text,
      spokenReply: isHinglish
        ? "Badiya! Ek simple sawaal se shuru karte hain."
        : "Awesome! Let's start with an easy one.",
    };
  }

  /**
   * Evaluates school answer
   */
  public static evaluateSchool(rawSpeech: string, lang: AssistantLanguage = 'ENGLISH'): ResponseEvaluation {
    const text = rawSpeech.trim();
    const lower = text.toLowerCase();
    const isHinglish = lang === 'HINGLISH';

    if (!text || lower === 'skip' || lower === 'pass' || lower === 'next' || lower === 'aage') {
      return {
        action: 'SKIP',
        extractedValue: 'Skipped',
        spokenReply: isHinglish
          ? "Koi baat nahi, school ka chapter skip karte hain!"
          : "No problem, skipping school days. Let's move on.",
      };
    }

    let cleaned = text
      .replace(/^(i studied at|i went to|it was|my school was|school was|padhai ki hai|mera school tha|at)\s+/i, '')
      .replace(/[.!?]+$/, '')
      .trim();

    if (!cleaned) cleaned = text;

    return {
      action: 'CONTINUE',
      extractedValue: cleaned,
      spokenReply: isHinglish
        ? `Arey waah, ${cleaned}! School ke dino ki toh alag hi yaadein hoti hain.`
        : `Ah, ${cleaned}! Certified classic. I bet you ruled the back benches and gave teachers high blood pressure!`,
    };
  }

  /**
   * Evaluates crush answer
   */
  public static evaluateCrush(rawSpeech: string, lang: AssistantLanguage = 'ENGLISH'): ResponseEvaluation {
    const text = rawSpeech.trim();
    const lower = text.toLowerCase();
    const isHinglish = lang === 'HINGLISH';

    if (!text || lower === 'skip' || lower === 'next' || lower === 'aage') {
      return {
        action: 'SKIP',
        extractedValue: 'Skipped',
        spokenReply: isHinglish ? 'Theek hai bhai, aage badhte hain 😄' : 'Taking the fifth amendment, huh? Respect! Moving on 😄',
      };
    }

    const secretPatterns = [
      'secret',
      'private',
      'classified',
      'kisi ko nahi',
      'nahi bataunga',
      'nahi batana',
      'shh',
      'personal',
      'chup',
    ];

    const nobodyPatterns = [
      'nobody',
      'no one',
      'none',
      'koi nahi',
      'single',
      'kuch nahi',
      'never',
    ];

    for (const sec of secretPatterns) {
      if (lower.includes(sec)) {
        return {
          action: 'CONTINUE',
          extractedValue: 'Secret (Classified)',
          spokenReply: isHinglish
            ? "Haha, samajh gaya bhai! Ye baat safe rahegi, kisi ko nahi bataunga 😄"
            : "Haha, top secret CIA clearance! Don't worry, your secrets are locked in my neural vault 😄",
        };
      }
    }

    for (const nob of nobodyPatterns) {
      if (lower.includes(nob)) {
        return {
          action: 'CONTINUE',
          extractedValue: 'None (Single)',
          spokenReply: isHinglish
            ? "Nobody? Sahi hai bhai, single life zindabad 😄 Aage badhte hain!"
            : "Nobody? Just raw dedication to two wheels and pure horsepower! Respect, moving on 😄",
        };
      }
    }

    let cleaned = text
      .replace(/^(her name was|his name was|it was|naam tha|naam hai)\s+/i, '')
      .replace(/[.!?]+$/, '')
      .trim();

    return {
      action: 'CONTINUE',
      extractedValue: cleaned,
      spokenReply: isHinglish
        ? `Oooh, ${cleaned}! Sahi hai bhai, main details nahi poochunga 😄`
        : `Ooooh, ${cleaned}! Look at you blushing under that helmet! I won't grill you for the spicy details 😄`,
    };
  }

  /**
   * Evaluates helmet singing confession
   */
  public static evaluateHelmetSinging(rawSpeech: string, lang: AssistantLanguage = 'ENGLISH'): ResponseEvaluation {
    const text = rawSpeech.trim();
    const lower = text.toLowerCase();
    const isHinglish = lang === 'HINGLISH';

    if (!text || lower === 'skip' || lower === 'next' || lower === 'aage') {
      return {
        action: 'SKIP',
        extractedValue: 'Skipped',
        spokenReply: isHinglish ? 'Haha, chalo ye raaz hi rehne dete hain 😄' : 'Haha, keeping that a mystery! Moving on 😄',
      };
    }

    const yesPatterns = ['yes', 'yeah', 'always', 'all the time', 'haan', 'ha', 'gaata', 'gaate', 'loud', 'definitely', 'हाँ', 'हां', 'गाता', 'गाते', 'बिल्कुल'];
    const noPatterns = ['no', 'never', 'nah', 'nope', 'nahi', 'nhi', 'dont', "don't", 'kabhi nahi', 'नहीं', 'ना', 'कभी नहीं'];

    for (const no of noPatterns) {
      if (lower.includes(no)) {
        return {
          action: 'CONTINUE',
          extractedValue: 'No (Quiet Rider)',
          spokenReply: isHinglish
            ? "Arey yaar, miss kar rahe ho! Khali highway pe helmet concert best therapy hoti hai 😄"
            : "Come on, you're missing out! A solo helmet concert on an open highway is pure therapy 😄",
        };
      }
    }

    for (const yes of yesPatterns) {
      if (lower.includes(yes)) {
        return {
          action: 'CONTINUE',
          extractedValue: 'Yes (Helmet Rocker 🎤)',
          spokenReply: isHinglish
            ? "Haha, mujhe pata tha! Helmet ke andar ka private concert alag hi level hota hai 😄"
            : "Haha, I knew it! Helmet acoustics are undefeated. Free private concert on wheels 😄",
        };
      }
    }

    return {
      action: 'CONTINUE',
      extractedValue: text,
      spokenReply: isHinglish
        ? 'Waah, gaane sunte rehna chahiye! Helmet mein gaane se alertness bhi bani rehti hai 😄'
        : 'Love the musical vibe! Singing inside the helmet actually keeps alertness sharp anyway 😄',
    };
  }

  /**
   * Evaluates midnight ride cravings
   */
  public static evaluateChaiCraving(rawSpeech: string, lang: AssistantLanguage = 'ENGLISH'): ResponseEvaluation {
    const text = rawSpeech.trim();
    const lower = text.toLowerCase();
    const isHinglish = lang === 'HINGLISH';

    if (!text || lower === 'skip' || lower === 'next' || lower === 'aage') {
      return {
        action: 'SKIP',
        extractedValue: 'Skipped',
        spokenReply: isHinglish ? 'Bhookh bacha ke rakh rahe ho, theek hai!' : 'Saving the appetite for later! Moving to the next one.',
      };
    }

    if (lower.includes('chai') || lower.includes('tea') || lower.includes('tapri') || lower.includes('kadak') || lower.includes('चाय') || lower.includes('टपरी')) {
      return {
        action: 'CONTINUE',
        extractedValue: 'Tapri Chai & Bun Maska ☕',
        spokenReply: isHinglish
          ? 'Asli Hindustani rider! Raat ki thandi hawa mein kadak tapri chai ka koi muqabla nahi.'
          : 'A true rider at heart! Nothing beats a hot steaming tapri chai on a midnight cruise.',
      };
    }

    if (lower.includes('maggi') || lower.includes('noodle') || lower.includes('maggie') || lower.includes('मैगी') || lower.includes('नूडल')) {
      return {
        action: 'CONTINUE',
        extractedValue: '2 AM Highway Maggi 🍜',
        spokenReply: isHinglish
          ? 'Late night highway Maggi toh emotion hai bhai! Safar ka maza double ho jata hai.'
          : 'Late night highway Maggi is pure emotion! Instant fuel for late-night cruising.',
      };
    }

    if (lower.includes('both') || lower.includes('dono') || lower.includes('dono hi') || lower.includes('दोनों')) {
      return {
        action: 'CONTINUE',
        extractedValue: 'Chai + Maggi Combo ☕🍜',
        spokenReply: isHinglish
          ? 'Zabardast choice! Kadak chai ke saath garma-garam Maggi — combo of champions!'
          : 'The ultimate combo! Steaming chai and highway noodles — true rider fuel.',
      };
    }

    if (lower.includes('coffee') || lower.includes('cold coffee')) {
      return {
        action: 'CONTINUE',
        extractedValue: 'Cold Coffee 🥤',
        spokenReply: isHinglish
          ? 'Cold coffee! Dimaag aur aankhein dono laser-sharp rahengi sadak pe.'
          : 'Caffeine fuel! Keeps the eyes wide and laser-focused on the road.',
      };
    }

    if (lower.includes('both') || lower.includes('dono') || lower.includes('sab') || lower.includes('everything')) {
      return {
        action: 'CONTINUE',
        extractedValue: 'Chai + Maggi Feast ☕🍜',
        spokenReply: isHinglish
          ? 'Haha, full midnight feast! Riding bhi solid aur khana bhi solid.'
          : 'Haha, full midnight feast! You ride hard and eat harder.',
      };
    }

    return {
      action: 'CONTINUE',
      extractedValue: text,
      spokenReply: isHinglish
        ? `Mmm, ${text}! Raat ki ride ke snacks ka maza hi kuch aur hai.`
        : `Mmm, ${text}! Midnight roadside cravings are an essential part of the riding soul.`,
    };
  }

  /**
   * Evaluates biggest road pet peeves
   */
  public static evaluatePetPeeve(rawSpeech: string, lang: AssistantLanguage = 'ENGLISH'): ResponseEvaluation {
    const text = rawSpeech.trim();
    const lower = text.toLowerCase();
    const isHinglish = lang === 'HINGLISH';

    if (!text || lower === 'skip' || lower === 'next' || lower === 'aage') {
      return {
        action: 'SKIP',
        extractedValue: 'Skipped',
        spokenReply: isHinglish ? 'Sadak pe shaant rehna hi sabse bada superpower hai!' : 'Staying calm and composed on the road, I respect that!',
      };
    }

    if (lower.includes('high beam') || lower.includes('beam') || lower.includes('light') || lower.includes('aankh')) {
      return {
        action: 'CONTINUE',
        extractedValue: 'High-Beam Blinders 🔦',
        spokenReply: isHinglish
          ? 'Uff, high beam wale! In logon ko gaadi chalane se pehle low beam ka matlab sikhana chahiye.'
          : 'Ugh, high-beam warriors! People genuinely need to learn low-beam etiquette before getting behind the wheel.',
      };
    }

    if (lower.includes('indicator') || lower.includes('signal') || lower.includes('turn') || lower.includes('mood')) {
      return {
        action: 'CONTINUE',
        extractedValue: 'Zero-Indicator Turns 🚦',
        spokenReply: isHinglish
          ? 'Bina indicator ke achanak turn lena! Jaise doosro ke paas dimaag padhne ki shakti ho 😄'
          : 'Turning without indicators! As if other riders can read minds through telepathy 😄 Classic road chaos.',
      };
    }

    if (lower.includes('horn') || lower.includes('honk') || lower.includes('aawaz') || lower.includes('noise')) {
      return {
        action: 'CONTINUE',
        extractedValue: 'Non-stop Honkers 📢',
        spokenReply: isHinglish
          ? 'Red light pe non-stop horn bajana! Jaise horn bajane se signal pehle green ho jayega 😄'
          : 'Non-stop honking at red lights! As if blasting the horn makes the signal turn green any faster 😄',
      };
    }

    if (lower.includes('cut') || lower.includes('lane') || lower.includes('slow') || lower.includes('overtake')) {
      return {
        action: 'CONTINUE',
        extractedValue: 'Reckless Lane Cutters 🏎',
        spokenReply: isHinglish
          ? 'Achanak aake cut maarna! Isi liye hamara CrashCam vision 24 ghante active rehta hai.'
          : "Cutting in without space! That's exactly why our CrashCam vision stays on watch 24/7.",
      };
    }

    return {
      action: 'CONTINUE',
      extractedValue: text,
      spokenReply: isHinglish
        ? `Sahi baat hai! Sadak pe common sense hona aaj kal ek rare superpower hai.`
        : `Preach! Road manners and common sense are truly a rare superpower nowadays.`,
    };
  }

  /**
   * Evaluates passion answer
   */
  public static evaluatePassion(rawSpeech: string, lang: AssistantLanguage = 'ENGLISH'): ResponseEvaluation {
    const text = rawSpeech.trim();
    const lower = text.toLowerCase();
    const isHinglish = lang === 'HINGLISH';

    if (!text || lower === 'skip' || lower === 'next' || lower === 'aage') {
      return {
        action: 'SKIP',
        extractedValue: 'Skipped',
        spokenReply: isHinglish ? 'Samajh gaya dost! Ride pe focus banaye rakhte hain.' : 'Understood! Keeping our ride focused.',
      };
    }

    let cleaned = text
      .replace(/^(i love|i like|my passion is|really passionate about|passionate about|into|mujhe pasand hai|shauk hai)\s+/i, '')
      .replace(/[.!?]+$/, '')
      .trim();

    if (!cleaned) cleaned = text;

    if (lower.includes('code') || lower.includes('coding') || lower.includes('program') || lower.includes('software')) {
      return {
        action: 'CONTINUE',
        extractedValue: cleaned,
        spokenReply: isHinglish
          ? "Shaandar 😄 Ek coder sadak pe! Main is session ke liye yaad rakhunga."
          : "Nice 😄 A coder on the road. I'll remember that for this session.",
      };
    }

    if (lower.includes('cricket') || lower.includes('football') || lower.includes('sports') || lower.includes('gym') || lower.includes('fitness')) {
      return {
        action: 'CONTINUE',
        extractedValue: cleaned,
        spokenReply: isHinglish
          ? `Zabardast, fitness aur sports ka josh! ${cleaned} badhiya shauk hai. Yaad rakhunga.`
          : `Awesome, love that athletic spirit! ${cleaned} is a great pursuit. I'll remember that for this session.`,
      };
    }

    if (lower.includes('music') || lower.includes('guitar') || lower.includes('sing') || lower.includes('gaana') || lower.includes('songs')) {
      return {
        action: 'CONTINUE',
        extractedValue: cleaned,
        spokenReply: isHinglish
          ? "Badiya! Achha sangeet har ride ko yaadgaar bana deta hai. Yaad rakhunga."
          : "Nice! Great music makes every ride better. I'll remember that for this session.",
      };
    }

    if (lower.includes('car') || lower.includes('bike') || lower.includes('riding') || lower.includes('driving') || lower.includes('gaadi')) {
      return {
        action: 'CONTINUE',
        extractedValue: cleaned,
        spokenReply: isHinglish
          ? "Dil se petrolhead! Gaadi aur sadak se pyaar alag hi hota hai."
          : "A true motorist at heart! I'll remember that for this session.",
      };
    }

    if (lower.includes('gaming') || lower.includes('game') || lower.includes('esports')) {
      return {
        action: 'CONTINUE',
        extractedValue: cleaned,
        spokenReply: isHinglish
          ? "Gamer reflexes sadak pe! Main is session ke liye yaad rakhunga."
          : "Gamer reflexes on the road! I'll remember that for this session.",
      };
    }

    return {
      action: 'CONTINUE',
      extractedValue: cleaned,
      spokenReply: isHinglish
        ? `Bohot khoob! ${cleaned} sunke maza aa gaya. Main is session ke liye yaad rakhunga.`
        : `Nice. ${cleaned} sounds like your thing! I'll remember that for this session.`,
    };
  }
}
