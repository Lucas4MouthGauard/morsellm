// Morse × LLM Demo - 核心功能实现
class MorseCode {
  constructor() {
    this.morseMap = {
      'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
      'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
      'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
      'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
      'Y': '-.--', 'Z': '--..',
      '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
      '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
      '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', '/': '-..-.',
      '@': '.--.-.', '-': '-....-', ':': '---...'
    };
    
    this.reverseMap = {};
    for (let [key, value] of Object.entries(this.morseMap)) {
      this.reverseMap[value] = key;
    }
    
    this.audioContext = null;
    this.isPlaying = false;
    this.currentSequence = null;
    
    this.initAudio();
    this.initEventListeners();
    this.loadPromptTemplates();
    this.initRetroStation();
  }
  
  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('WebAudio API not supported:', e);
    }
  }
  
  initEventListeners() {
    // 文本转摩斯
    document.getElementById('btnText2Morse').addEventListener('click', () => {
      const text = document.getElementById('txtIn').value.trim();
      if (text) {
        const morse = this.textToMorse(text);
        document.getElementById('morseOut').value = morse;
        document.getElementById('morseIn').value = morse;
      }
    });
    
    // 摩斯转文本
    document.getElementById('btnMorse2Text').addEventListener('click', () => {
      const morse = document.getElementById('morseIn').value.trim();
      if (morse) {
        const text = this.morseToText(morse);
        document.getElementById('txtOut').value = text;
      }
    });
    
    // 清空按钮
    document.getElementById('btnClearText').addEventListener('click', () => {
      document.getElementById('txtIn').value = '';
      document.getElementById('morseOut').value = '';
    });
    
    document.getElementById('btnClearMorse').addEventListener('click', () => {
      document.getElementById('morseIn').value = '';
      document.getElementById('txtOut').value = '';
    });
    
    // 播放摩斯
    document.getElementById('btnPlayMorse').addEventListener('click', () => {
      const morse = document.getElementById('morseIn').value.trim();
      if (morse) {
        this.playMorse(morse);
      }
    });
    
    // 停止播放
    document.getElementById('btnStop').addEventListener('click', () => {
      this.stopMorse();
    });
    
    // 复制按钮
    document.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-copy');
        const text = document.getElementById(targetId).value;
        this.copyToClipboard(text);
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = btn.getAttribute('data-copy') === 'sys' ? 'Copy System' : 
          btn.getAttribute('data-copy') === 'assistant' ? 'Copy Assistant Template' : 'Copy User Example', 1000);
      });
    });
    
    // 开发者工具按钮
    document.getElementById('btnCopyMorse').addEventListener('click', () => {
      const morse = document.getElementById('morseOut').value;
      this.copyToClipboard(morse);
    });
    
    document.getElementById('btnCopyText').addEventListener('click', () => {
      const text = document.getElementById('txtOut').value;
      this.copyToClipboard(text);
    });
    
    document.getElementById('btnPlayOut').addEventListener('click', () => {
      const morse = document.getElementById('morseOut').value.trim();
      if (morse) {
        this.playMorse(morse);
      }
    });
    
    document.getElementById('btnToMorse').addEventListener('click', () => {
      const text = document.getElementById('txtOut').value.trim();
      if (text) {
        const morse = this.textToMorse(text);
        document.getElementById('morseOut').value = morse;
      }
    });
  }
  
  textToMorse(text) {
    return text.toUpperCase().split('').map(char => {
      if (char === ' ') return '/';
      return this.morseMap[char] || char;
    }).join(' ');
  }
  
  morseToText(morse) {
    return morse.split(' ').map(code => {
      if (code === '/') return ' ';
      return this.reverseMap[code] || code;
    }).join('');
  }
  
  async playMorse(morse) {
    if (!this.audioContext || this.isPlaying) return;
    
    this.isPlaying = true;
    this.currentSequence = morse;
    
    const freq = parseInt(document.getElementById('freq').value) || 700;
    const unitMs = parseInt(document.getElementById('unit').value) || 80;
    
    const sequence = morse.split(' ').filter(code => code.length > 0);
    let currentTime = this.audioContext.currentTime;
    
    for (let i = 0; i < sequence.length; i++) {
      const code = sequence[i];
      
      if (code === '/') {
        // 词间隔：7个单位
        currentTime += unitMs * 7 / 1000;
        continue;
      }
      
      for (let j = 0; j < code.length; j++) {
        const symbol = code[j];
        const duration = symbol === '.' ? unitMs : unitMs * 3;
        
        if (symbol === '.' || symbol === '-') {
          this.playTone(freq, currentTime, duration / 1000);
        }
        
        currentTime += duration / 1000;
        
        // 符号间隔：1个单位（除了最后一个符号）
        if (j < code.length - 1) {
          currentTime += unitMs / 1000;
        }
      }
      
      // 字母间隔：3个单位（除了最后一个字母）
      if (i < sequence.length - 1 && sequence[i + 1] !== '/') {
        currentTime += unitMs * 3 / 1000;
      }
    }
    
    // 播放完成后重置状态
    setTimeout(() => {
      this.isPlaying = false;
      this.currentSequence = null;
    }, (currentTime - this.audioContext.currentTime) * 1000);
  }
  
  playTone(frequency, startTime, duration) {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }
  
  stopMorse() {
    this.isPlaying = false;
    this.currentSequence = null;
  }
  
  copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('Copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy:', err);
        this.fallbackCopy(text);
      });
    } else {
      this.fallbackCopy(text);
    }
  }
  
  fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    document.body.removeChild(textArea);
  }
  
  loadPromptTemplates() {
    // System prompt
    document.getElementById('sys').value = `You are a Morse code expert assistant. Please follow these rules:

1. When users input Morse code starting with "MORSE:", first convert it to readable text, then have a conversation based on that text
2. In your responses, if involving Morse code related content, use "MORSE: [Morse code]" format
3. Morse code format: letters separated by spaces, words separated by "/"
4. Supports A-Z, 0-9, common punctuation symbols in Morse code

Example:
User: "MORSE: .... . .-.. .-.. --- / .-- --- .-. .-.. -.."
Assistant: "Received Morse code: HELLO WORLD
MORSE: .... . .-.. .-.. --- / .-- --- .-. .-.. -.."`;

    // Assistant template
    document.getElementById('assistant').value = `MORSE: [Morse code content]

[Your response content]

If you need to continue Morse code communication, use the above format.`;

    // User example
    document.getElementById('user').value = `MORSE: .... . .-.. .-.. --- / .-.. .-.. --`;
  }
  
  initRetroStation() {
    // Geek Challenge: Load the LLM
    document.getElementById('btnCheckChallenge').addEventListener('click', () => {
      const input = document.getElementById('challengeInput').value.trim();
      const expectedMorse = '.-.. --- .- -.. / .-.. .-.. --'; // LOAD LLM
      
      if (input === expectedMorse) {
        document.getElementById('challengeResult').classList.remove('hidden');
        this.playSuccessSound();
        this.updateStationStatus('ACTIVE');
        
        // Auto-scroll to contract address
        setTimeout(() => {
          document.getElementById('challengeResult').scrollIntoView({ behavior: 'smooth' });
        }, 500);
      } else {
        this.showChallengeError();
      }
    });
    
    // Survival Mode
    document.getElementById('btnEmergencySignal').addEventListener('click', () => {
      this.sendEmergencySignal();
    });
    
    document.getElementById('btnSurvivalTest').addEventListener('click', () => {
      this.testSurvivalMode();
    });
    
    // Auto-complete challenge input with placeholder
    document.getElementById('challengeInput').addEventListener('focus', () => {
      if (!document.getElementById('challengeInput').value) {
        document.getElementById('challengeInput').placeholder = '.-.. --- .- -.. / .-.. .-.. --';
      }
    });
  }
  
  playSuccessSound() {
    if (!this.audioContext) return;
    
    // Play a success melody
    const freq = 800;
    const now = this.audioContext.currentTime;
    
    // Play a little victory tune
    this.playTone(freq, now, 0.1);
    this.playTone(freq * 1.25, now + 0.15, 0.1);
    this.playTone(freq * 1.5, now + 0.3, 0.2);
  }
  
  updateStationStatus(status) {
    const statusText = document.querySelector('.status-text');
    const statusLight = document.querySelector('.status-light');
    
    statusText.textContent = status;
    
    if (status === 'ACTIVE') {
      statusLight.style.background = '#52d273';
      statusLight.style.animation = 'pulse 1s ease-in-out infinite';
    } else if (status === 'STANDBY') {
      statusLight.style.background = '#52d273';
      statusLight.style.animation = 'pulse 2s ease-in-out infinite';
    }
  }
  
  showChallengeError() {
    const input = document.getElementById('challengeInput');
    input.style.borderColor = '#ff6b6b';
    input.style.animation = 'shake 0.5s ease-in-out';
    
    setTimeout(() => {
      input.style.borderColor = '#243160';
      input.style.animation = '';
    }, 500);
  }
  
  sendEmergencySignal() {
    const survivalStatus = document.getElementById('survivalStatus');
    const survivalText = document.getElementById('survivalText');
    
    const messages = [
      "Emergency signal transmitted via Morse × LLM",
      "SOS: Intelligence overload detected, switching to minimal interface",
      "Distress call: When AI talks too much, we need dots and dashes",
      "Mayday: Even with primitive signals, wisdom prevails"
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    survivalText.textContent = randomMessage;
    
    survivalStatus.classList.remove('hidden');
    
    // Play emergency signal
    this.playEmergencySignal();
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      survivalStatus.classList.add('hidden');
    }, 5000);
  }
  
  testSurvivalMode() {
    const survivalStatus = document.getElementById('survivalStatus');
    const survivalText = document.getElementById('survivalText');
    
    const testMessages = [
      "Survival mode: Offline intelligence transmission active",
      "Grid down scenario: Morse × LLM operational",
      "Apocalypse test: Primitive signals still work",
      "Dark age simulation: Even with minimal tech, AI responds"
    ];
    
    const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
    survivalText.textContent = randomMessage;
    
    survivalStatus.classList.remove('hidden');
    
    // Play test signal
    this.playTestSignal();
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      survivalStatus.classList.add('hidden');
    }, 4000);
  }
  
  playEmergencySignal() {
    if (!this.audioContext) return;
    
    // Play SOS in Morse: ... --- ...
    const now = this.audioContext.currentTime;
    const unit = 0.1;
    
    // S: ...
    this.playTone(600, now, unit);
    this.playTone(600, now + unit * 2, unit);
    this.playTone(600, now + unit * 3, unit);
    
    // O: ---
    this.playTone(600, now + unit * 5, unit * 3);
    this.playTone(600, now + unit * 9, unit * 3);
    this.playTone(600, now + unit * 13, unit * 3);
    
    // S: ...
    this.playTone(600, now + unit * 17, unit);
    this.playTone(600, now + unit * 19, unit);
    this.playTone(600, now + unit * 21, unit);
  }
  
  playTestSignal() {
    if (!this.audioContext) return;
    
    // Play a test pattern
    const now = this.audioContext.currentTime;
    const unit = 0.08;
    
    this.playTone(700, now, unit);
    this.playTone(700, now + unit * 2, unit);
    this.playTone(700, now + unit * 4, unit * 2);
    this.playTone(700, now + unit * 7, unit);
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new MorseCode();
});
