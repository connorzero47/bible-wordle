import React, { useEffect, useMemo, useState } from 'react';
import wordsData from './words.json';
import './App.css';

const MAX_GUESSES = 6;
const LENGTH_OPTIONS = [5, 6, 7, 8, 9, 10];

const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
];

function App() {
  const [wordLength, setWordLength] = useState(5);
  const [targetWord, setTargetWord] = useState('');
  const [category, setCategory] = useState('');
  const [input, setInput] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [timer, setTimer] = useState(120);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [shakeBoard, setShakeBoard] = useState(false);
  const [message, setMessage] = useState('');
  const [usedWordsByLength, setUsedWordsByLength] = useState({});

  const availableLengths = useMemo(() => {
    const lengthsInData = new Set(wordsData.map((w) => w.length));
    return LENGTH_OPTIONS.filter((len) => lengthsInData.has(len));
  }, []);

  const keyboardColors = useMemo(() => {
    const colors = {};

    guesses.forEach((guess) => {
      guess.forEach((letter) => {
        if (!letter) return;

        const current = colors[letter.char];

        if (letter.color === 'green') {
          colors[letter.char] = 'green';
        } else if (letter.color === 'yellow' && current !== 'green') {
          colors[letter.char] = 'yellow';
        } else if (
          letter.color === 'gray' &&
          current !== 'green' &&
          current !== 'yellow'
        ) {
          colors[letter.char] = 'gray';
        }
      });
    });

    return colors;
  }, [guesses]);

  useEffect(() => {
    if (!availableLengths.includes(wordLength) && availableLengths.length > 0) {
      setWordLength(availableLengths[0]);
    }
  }, [availableLengths, wordLength]);

  useEffect(() => {
    if (availableLengths.length > 0) {
      startNewGame(wordLength);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordLength, availableLengths.length]);

  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setGameOver(true);
          setWon(false);
          setMessage('⏰ Time’s up!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameOver]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'select' || activeTag === 'button') return;

      const key = e.key.toLowerCase();

      if (key === 'enter') {
        e.preventDefault();
        submitGuess();
        return;
      }

      if (key === 'backspace') {
        e.preventDefault();
        removeLetter();
        return;
      }

      if (/^[a-z]$/.test(key)) {
        e.preventDefault();
        addLetter(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const getRandomUnusedWord = (length) => {
    const allWordsForLength = wordsData.filter((w) => w.length === length);
    const usedSet = usedWordsByLength[length] || new Set();

    const unusedWords = allWordsForLength.filter(
      (w) => !usedSet.has(w.word.toLowerCase())
    );

    if (unusedWords.length === 0) return null;

    return unusedWords[Math.floor(Math.random() * unusedWords.length)];
  };

  const markWordAsUsed = (length, word) => {
    setUsedWordsByLength((prev) => {
      const next = { ...prev };
      const existingSet = next[length] ? new Set(next[length]) : new Set();
      existingSet.add(word.toLowerCase());
      next[length] = existingSet;
      return next;
    });
  };

  const startNewGame = (length = wordLength) => {
    const allWordsForLength = wordsData.filter((w) => w.length === length);

    // reset immediately so old guesses/input do not clash with new length
    setInput('');
    setGuesses([]);
    setTimer(120);
    setGameOver(false);
    setWon(false);
    setShakeBoard(false);
    setMessage('');

    if (allWordsForLength.length === 0) {
      setTargetWord('');
      setCategory('');
      setGameOver(true);
      setMessage('No words available for this length.');
      return;
    }

    const randomUnusedWord = getRandomUnusedWord(length);

    if (!randomUnusedWord) {
      setTargetWord('');
      setCategory('');
      setGameOver(true);
      setMessage(`All ${length}-letter words have been used. Refresh the page to reset.`);
      return;
    }

    setTargetWord(randomUnusedWord.word.toLowerCase());
    setCategory(randomUnusedWord.category);
    markWordAsUsed(length, randomUnusedWord.word);
  };

  const giveUp = () => {
    if (gameOver) return;
    setGameOver(true);
    setWon(false);
    setMessage('🚫 You gave up!');
  };

  const triggerShake = () => {
    setShakeBoard(true);
    setTimeout(() => setShakeBoard(false), 350);
  };

  const addLetter = (letter) => {
    if (gameOver) return;
    if (guesses.length >= MAX_GUESSES) return;
    if (input.length >= wordLength) return;

    setInput((prev) => prev + letter);
    setMessage('');
  };

  const removeLetter = () => {
    if (gameOver) return;
    setInput((prev) => prev.slice(0, -1));
    setMessage('');
  };

  const submitGuess = () => {
    if (gameOver) return;
    if (guesses.length >= MAX_GUESSES) return;

    if (input.length !== wordLength) {
      setMessage(`Enter a ${wordLength}-letter word.`);
      triggerShake();
      return;
    }

    const guess = input.toLowerCase();

    const result = guess.split('').map((char, i) => {
      if (char === targetWord[i]) return { char, color: 'green' };
      if (targetWord.includes(char)) return { char, color: 'yellow' };
      return { char, color: 'gray' };
    });

    const newGuesses = [...guesses, result];
    setGuesses(newGuesses);

    if (guess === targetWord) {
      setWon(true);
      setGameOver(true);
      setMessage('🎉 Correct!');
    } else if (newGuesses.length >= MAX_GUESSES) {
      setGameOver(true);
      setWon(false);
      setMessage('❌ No more guesses!');
    } else {
      setMessage('');
    }

    setInput('');
  };

  const handleKeyboardClick = (key) => {
    if (gameOver) return;

    if (key === 'enter') {
      submitGuess();
      return;
    }

    if (key === 'backspace') {
      removeLetter();
      return;
    }

    addLetter(key);
  };

  const formatTime = () => {
    const mins = Math.floor(timer / 60);
    const secs = String(timer % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="App">
      <div className="background-glow glow1"></div>
      <div className="background-glow glow2"></div>

      <div className="game-card">
        <div className="header-mark">✦</div>
        <h1 className="title">Bible Wordle</h1>
        <p className="subtitle">
          Guess the Bible word in 6 tries before time runs out.
        </p>

        <div className="top-bar">
          <div className="length-box">
            <span className="length-label">Word Length</span>
            <div className="length-buttons">
              {LENGTH_OPTIONS.map((len) => (
                <button
                  key={len}
                  className={`length-btn ${
                    wordLength === len ? 'active' : ''
                  } ${!availableLengths.includes(len) ? 'disabled' : ''}`}
                  onClick={() => availableLengths.includes(len) && setWordLength(len)}
                  disabled={!availableLengths.includes(len)}
                >
                  {len}
                </button>
              ))}
            </div>
          </div>

          <div className="timer-box">
            <span>Time Left</span>
            <strong>{formatTime()}</strong>
          </div>
        </div>

        <div className="category-box">
          <span className="category-label">Category</span>
          <span className="category-value">{category || '—'}</span>
        </div>

        {gameOver && targetWord && (
          <div className="answer-box">
            <span className="answer-label">Answer</span>
            <span className="answer-value">{targetWord.toUpperCase()}</span>
          </div>
        )}

        {message && <div className="message-box">{message}</div>}

        <div className={`board ${shakeBoard ? 'shake' : ''}`}>
          {Array.from({ length: MAX_GUESSES }).map((_, rowIndex) => {
            const guess = guesses[rowIndex];

            return (
              <div key={rowIndex} className="row">
                {Array.from({ length: wordLength }).map((_, colIndex) => {
                  if (guess) {
                    const letter = guess[colIndex];

                    if (!letter) {
                      return <div key={colIndex} className="cell empty"></div>;
                    }

                    return (
                      <div
                        key={colIndex}
                        className={`cell reveal ${letter.color}`}
                        style={{ animationDelay: `${colIndex * 0.12}s` }}
                      >
                        {letter.char}
                      </div>
                    );
                  }

                  if (rowIndex === guesses.length && !gameOver) {
                    return (
                      <div
                        key={colIndex}
                        className={`cell current ${input[colIndex] ? 'filled pop' : ''}`}
                      >
                        {input[colIndex] || ''}
                      </div>
                    );
                  }

                  return <div key={colIndex} className="cell empty"></div>;
                })}
              </div>
            );
          })}
        </div>

        <div className="button-row">
          <button className="new-game-btn" onClick={() => startNewGame()}>
            New Game
          </button>
          <button className="give-up-btn" onClick={giveUp} disabled={gameOver}>
            Give Up
          </button>
        </div>

        <div className="keyboard">
          {KEYBOARD_ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className="keyboard-row">
              {row.map((key) => (
                <button
                  key={key}
                  className={`key-btn ${
                    key === 'enter' || key === 'backspace' ? 'wide-key' : ''
                  } ${keyboardColors[key] || ''}`}
                  onClick={() => handleKeyboardClick(key)}
                  disabled={gameOver}
                >
                  {key === 'backspace' ? '⌫' : key === 'enter' ? 'Enter' : key}
                </button>
              ))}
            </div>
          ))}
        </div>

        {gameOver && (
          <div className={`result-box ${won ? 'win' : 'lose'}`}>
            {won ? <h3>🎉 You got it!</h3> : <h3>⏰ Game Over!</h3>}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;