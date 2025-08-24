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
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new MorseCode();
});
