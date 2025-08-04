import React, { useState, useEffect, useCallback } from 'react';

interface BoxDimensions {
  rows: number;
  cols: number;
}

interface DifficultySettings {
  lives: number;
  hints: number;
}

interface LeaderboardEntry {
  id: number;
  gridSize: number;
  difficulty: string;
  time: number;
  hintsUsed: number;
  date: string;
}

const SudokuGame: React.FC = () => {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameOver' | 'won' | 'leaderboard'>('menu');
  const [gridSize, setGridSize] = useState<number>(4);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [board, setBoard] = useState<number[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [initialBoard, setInitialBoard] = useState<number[][]>([]);
  const [lives, setLives] = useState<number>(5);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [maxHints, setMaxHints] = useState<number>(10);
  const [animatingCells, setAnimatingCells] = useState<Set<string>>(new Set());
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [lockedCells, setLockedCells] = useState<Set<string>>(new Set());
  const [startTime, setStartTime] = useState<number | null>(null);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'playing' && startTime) {
      interval = setInterval(() => {
        setCurrentTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, startTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBoxDimensions = (size: number): BoxDimensions => {
    switch(size) {
      case 4: return { rows: 2, cols: 2 };
      case 6: return { rows: 2, cols: 3 };
      case 9: return { rows: 3, cols: 3 };
      default: return { rows: 3, cols: 3 };
    }
  };

  const generateSolution = useCallback((size: number): number[][] => {
    const maxAttempts = 50;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const board = Array(size).fill(null).map(() => Array(size).fill(0));
      const { rows: boxRows, cols: boxCols } = getBoxDimensions(size);
      
      const isValid = (board: number[][], row: number, col: number, num: number): boolean => {
        for (let x = 0; x < size; x++) {
          if (board[row][x] === num) return false;
        }
        
        for (let x = 0; x < size; x++) {
          if (board[x][col] === num) return false;
        }
        
        const boxRow = Math.floor(row / boxRows) * boxRows;
        const boxCol = Math.floor(col / boxCols) * boxCols;
        
        for (let r = boxRow; r < boxRow + boxRows; r++) {
          for (let c = boxCol; c < boxCol + boxCols; c++) {
            if (board[r][c] === num) return false;
          }
        }
        return true;
      };
      
      const shuffle = (array: number[]): number[] => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
      };
      
      const solve = (board: number[][]): boolean => {
        let bestCell = null;
        let minPossibilities = size + 1;
        
        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            if (board[row][col] === 0) {
              let possibilities = 0;
              for (let num = 1; num <= size; num++) {
                if (isValid(board, row, col, num)) {
                  possibilities++;
                }
              }
              if (possibilities < minPossibilities) {
                minPossibilities = possibilities;
                bestCell = { row, col };
              }
              if (possibilities === 0) return false;
            }
          }
        }
        
        if (!bestCell) return true;
        
        const { row, col } = bestCell;
        const numbers = shuffle(Array.from({length: size}, (_, i) => i + 1));
        
        for (const num of numbers) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solve(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      };
      
      const firstRowNumbers = shuffle(Array.from({length: size}, (_, i) => i + 1));
      for (let col = 0; col < size; col++) {
        board[0][col] = firstRowNumbers[col];
      }
      
      if (solve(board)) {
        if (validateCompleteSolution(board, size)) {
          return board;
        }
      }
    }
    
    return createValidFallbackBoard(size);
  }, []);

  const validateCompleteSolution = (board: number[][], size: number): boolean => {
    const { rows: boxRows, cols: boxCols } = getBoxDimensions(size);
    
    for (let row = 0; row < size; row++) {
      const seen = new Set();
      for (let col = 0; col < size; col++) {
        const num = board[row][col];
        if (num < 1 || num > size || seen.has(num)) return false;
        seen.add(num);
      }
    }
    
    for (let col = 0; col < size; col++) {
      const seen = new Set();
      for (let row = 0; row < size; row++) {
        const num = board[row][col];
        if (seen.has(num)) return false;
        seen.add(num);
      }
    }
    
    for (let boxRowStart = 0; boxRowStart < size; boxRowStart += boxRows) {
      for (let boxColStart = 0; boxColStart < size; boxColStart += boxCols) {
        const seen = new Set();
        for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
          for (let c = boxColStart; c < boxColStart + boxCols; c++) {
            const num = board[r][c];
            if (seen.has(num)) return false;
            seen.add(num);
          }
        }
      }
    }
    
    return true;
  };

  const createValidFallbackBoard = (size: number): number[][] => {
    const board = Array(size).fill(null).map(() => Array(size).fill(0));
    const { rows: boxRows, cols: boxCols } = getBoxDimensions(size);
    
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        let num = ((row * boxCols + Math.floor(row / boxRows) + col) % size) + 1;
        board[row][col] = num;
      }
    }
    
    const mapping: {[key: number]: number} = {};
    const numbers = Array.from({length: size}, (_, i) => i + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    
    for (let i = 1; i <= size; i++) {
      mapping[i] = numbers[i - 1];
    }
    
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        board[row][col] = mapping[board[row][col]];
      }
    }
    
    return board;
  };

  const createPuzzle = useCallback((solution: number[][], difficulty: string, size: number): number[][] => {
    const puzzle = solution.map(row => [...row]);
    const totalCells = size * size;
    
    let cellsToRemove;
    switch(difficulty) {
      case 'easy': cellsToRemove = Math.floor(totalCells * 0.4); break;
      case 'medium': cellsToRemove = Math.floor(totalCells * 0.55); break;
      case 'hard': cellsToRemove = Math.floor(totalCells * 0.65); break;
      default: cellsToRemove = Math.floor(totalCells * 0.4);
    }
    
    const positions: [number, number][] = [];
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        positions.push([i, j]);
      }
    }
    
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    
    for (let i = 0; i < cellsToRemove && i < positions.length; i++) {
      const [row, col] = positions[i];
      puzzle[row][col] = 0;
    }
    
    return puzzle;
  }, []);

  const getDifficultySettings = (difficulty: string, size: number): DifficultySettings => {
    const getBoxCount = (size: number) => {
      const { rows, cols } = getBoxDimensions(size);
      return (size / rows) * (size / cols);
    };
    
    const boxCount = getBoxCount(size);
    const baseHints = Math.max(1, Math.floor(boxCount * 0.7));
    
    switch(difficulty) {
      case 'easy': return { lives: 5, hints: baseHints + 1 };
      case 'medium': return { lives: 4, hints: baseHints };
      case 'hard': return { lives: 3, hints: Math.max(1, baseHints - 1) };
      default: return { lives: 5, hints: baseHints + 1 };
    }
  };

  const startNewGame = () => {
    const newSolution = generateSolution(gridSize);
    const newPuzzle = createPuzzle(newSolution, difficulty, gridSize);
    const settings = getDifficultySettings(difficulty, gridSize);
    
    setSolution(newSolution);
    setBoard(newPuzzle);
    setInitialBoard(newPuzzle.map(row => [...row]));
    setLives(settings.lives);
    setMaxHints(settings.hints);
    setHintsUsed(0);
    setGameState('playing');
    setAnimatingCells(new Set());
    setSelectedCell(null);
    setLockedCells(new Set());
    setStartTime(Date.now());
    setCompletionTime(null);
    setCurrentTime(0);
  };

  const isValidMove = (board: number[][], row: number, col: number, num: number, size: number): boolean => {
    const { rows: boxRows, cols: boxCols } = getBoxDimensions(size);
    
    for (let x = 0; x < size; x++) {
      if (x !== col && board[row][x] === num) return false;
    }
    
    for (let x = 0; x < size; x++) {
      if (x !== row && board[x][col] === num) return false;
    }
    
    const boxRow = Math.floor(row / boxRows) * boxRows;
    const boxCol = Math.floor(col / boxCols) * boxCols;
    
    for (let r = boxRow; r < boxRow + boxRows; r++) {
      for (let c = boxCol; c < boxCol + boxCols; c++) {
        if ((r !== row || c !== col) && board[r][c] === num) return false;
      }
    }
    
    return true;
  };

  const handleCellClick = (row: number, col: number) => {
    const cellKey = `${row}-${col}`;
    if (initialBoard[row][col] !== 0 || lockedCells.has(cellKey)) return;
    setSelectedCell({ row, col });
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell) return;
    
    const { row, col } = selectedCell;
    const cellKey = `${row}-${col}`;
    if (initialBoard[row][col] !== 0 || lockedCells.has(cellKey)) return;
    
    const newBoard = board.map(row => [...row]);
    
    if (num === 0) {
      newBoard[row][col] = 0;
      setBoard(newBoard);
      return;
    }
    
    if (num < 1 || num > gridSize) return;
    
    newBoard[row][col] = num;
    
    if (isValidMove(newBoard, row, col, num, gridSize)) {
      setAnimatingCells(prev => new Set(prev).add(`${cellKey}-correct`));
      setBoard(newBoard);
      setLockedCells(prev => new Set(prev).add(cellKey));
      setSelectedCell(null);
      
      setTimeout(() => {
        setAnimatingCells(prev => {
          const newSet = new Set(prev);
          newSet.delete(`${cellKey}-correct`);
          return newSet;
        });
      }, 800);
      
      const isComplete = newBoard.every((row, r) => 
        row.every((cell, c) => cell !== 0)
      );
      
      if (isComplete) {
        const endTime = Date.now();
        const timeTaken = Math.floor((endTime - (startTime || 0)) / 1000);
        setCompletionTime(timeTaken);
        
        const newEntry: LeaderboardEntry = {
          id: Date.now(),
          gridSize,
          difficulty,
          time: timeTaken,
          hintsUsed,
          date: new Date().toLocaleDateString()
        };
        
        const newLeaderboard = [...leaderboard, newEntry];
        newLeaderboard.sort((a, b) => a.time - b.time);
        const topLeaderboard = newLeaderboard.slice(0, 10);
        setLeaderboard(topLeaderboard);
        
        setGameState('won');
      }
    } else {
      setAnimatingCells(prev => new Set(prev).add(`${cellKey}-wrong`));
      newBoard[row][col] = 0;
      setBoard(newBoard);
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameState('gameOver');
        }
        return newLives;
      });
      
      setTimeout(() => {
        setAnimatingCells(prev => {
          const newSet = new Set(prev);
          newSet.delete(`${cellKey}-wrong`);
          return newSet;
        });
      }, 800);
    }
  };

  const useHint = () => {
    if (hintsUsed >= maxHints) return;
    
    const emptyCells: [number, number][] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cellKey = `${r}-${c}`;
        if (board[r][c] === 0 && !lockedCells.has(cellKey)) {
          emptyCells.push([r, c]);
        }
      }
    }
    
    if (emptyCells.length === 0) return;
    
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const [row, col] = randomCell;
    const cellKey = `${row}-${col}`;
    
    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = solution[row][col];
    
    setBoard(newBoard);
    setHintsUsed(prev => prev + 1);
    setLockedCells(prev => new Set(prev).add(cellKey));
    
    setAnimatingCells(prev => new Set(prev).add(`${cellKey}-hint`));
    setTimeout(() => {
      setAnimatingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${cellKey}-hint`);
        return newSet;
      });
    }, 800);
  };

  const getCellClass = (row: number, col: number): string => {
    const { rows: boxRows, cols: boxCols } = getBoxDimensions(gridSize);
    const isRightBorder = (col + 1) % boxCols === 0 && col !== gridSize - 1;
    const isBottomBorder = (row + 1) % boxRows === 0 && row !== gridSize - 1;
    const cellKey = `${row}-${col}`;
    const isInitial = initialBoard[row][col] !== 0;
    const isLocked = lockedCells.has(cellKey);
    const isSelected = selectedCell && selectedCell.row === row && selectedCell.col === col;
    
    let classes = [
      'text-center font-bold transition-all duration-300 transform cursor-pointer outline-none',
      'bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-700',
      'border border-indigo-300 backdrop-blur-sm'
    ];
    
    if (isRightBorder) classes.push('border-r-4 border-r-indigo-600');
    if (isBottomBorder) classes.push('border-b-4 border-b-indigo-600');
    
    if (animatingCells.has(`${cellKey}-wrong`)) {
      classes = ['text-center font-bold transition-all duration-300 transform cursor-pointer outline-none backdrop-blur-sm'];
      classes.push('bg-red-600 text-white animate-pulse');
      classes.push(isRightBorder ? 'border-r-4 border-r-indigo-600' : 'border-r border-indigo-300');
      classes.push(isBottomBorder ? 'border-b-4 border-b-indigo-600' : 'border-b border-indigo-300');
      classes.push('border-t border-indigo-300 border-l border-indigo-300');
    } else if (animatingCells.has(`${cellKey}-correct`)) {
      classes = ['text-center font-bold transition-all duration-500 transform cursor-not-allowed outline-none backdrop-blur-sm'];
      classes.push('bg-green-600 text-white animate-bounce scale-110');
      classes.push(isRightBorder ? 'border-r-4 border-r-indigo-600' : 'border-r border-indigo-300');
      classes.push(isBottomBorder ? 'border-b-4 border-b-indigo-600' : 'border-b border-indigo-300');
      classes.push('border-t border-indigo-300 border-l border-indigo-300');
    } else if (animatingCells.has(`${cellKey}-hint`)) {
      classes = ['text-center font-bold transition-all duration-500 transform cursor-not-allowed outline-none backdrop-blur-sm'];
      classes.push('bg-yellow-500 text-slate-800 animate-pulse scale-105');
      classes.push(isRightBorder ? 'border-r-4 border-r-indigo-600' : 'border-r border-indigo-300');
      classes.push(isBottomBorder ? 'border-b-4 border-b-indigo-600' : 'border-b border-indigo-300');
      classes.push('border-t border-indigo-300 border-l border-indigo-300');
    } else if (isInitial) {
      classes.push('bg-gradient-to-br from-indigo-100 via-blue-50 to-indigo-200 text-indigo-800');
      classes.push('cursor-not-allowed');
    } else if (isLocked) {
      classes.push('bg-gradient-to-br from-emerald-100 via-green-50 to-emerald-200 text-emerald-800');
      classes.push('cursor-not-allowed');
    } else if (isSelected) {
      classes.push('ring-4 ring-blue-400 ring-offset-2 ring-offset-white');
      classes.push('bg-gradient-to-br from-blue-100 via-indigo-50 to-blue-200 scale-105');
    }
    
    return classes.join(' ');
  };

  const getCellSize = () => {
    let cellSize, fontSize;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    switch(gridSize) {
      case 4:
        cellSize = isMobile ? 50 : 60;
        fontSize = isMobile ? 18 : 20;
        break;
      case 6:
        cellSize = isMobile ? 40 : 50;
        fontSize = isMobile ? 16 : 18;
        break;
      case 9:
        cellSize = isMobile ? 30 : 40;
        fontSize = isMobile ? 14 : 16;
        break;
      default:
        cellSize = isMobile ? 30 : 40;
        fontSize = isMobile ? 14 : 16;
    }
    return { cellSize, fontSize };
  };

  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 flex items-center justify-center p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient"></div>
        <div className="absolute top-10 left-10 w-48 h-48 bg-blue-500 opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-indigo-500 opacity-10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        
        <div className="relative bg-white bg-opacity-10 backdrop-blur-xl rounded-3xl shadow-2xl p-10 w-full max-w-md border border-white border-opacity-20">
          <h1 className="text-5xl font-black text-center bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent mb-8">
            ✨ SUDOKU ✨
          </h1>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xl font-bold text-white text-opacity-90 mb-4">🎯 Grid Size</label>
              <div className="grid grid-cols-3 gap-3">
                {[4, 6, 9].map(size => (
                  <button
                    key={size}
                    onClick={() => setGridSize(size)}
                    className={`p-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 ${
                      gridSize === size 
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl scale-105' 
                        : 'bg-white bg-opacity-20 text-white text-opacity-80 hover:bg-opacity-30 backdrop-blur-sm border border-white border-opacity-30'
                    }`}
                  >
                    {size}×{size}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-xl font-bold text-white text-opacity-90 mb-4">⚡ Difficulty</label>
              <div className="grid grid-cols-3 gap-3">
                {(['easy', 'medium', 'hard'] as const).map(diff => (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`p-4 rounded-2xl font-bold text-lg capitalize transition-all duration-300 transform hover:scale-105 ${
                      difficulty === diff 
                        ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-xl scale-105' 
                        : 'bg-white bg-opacity-20 text-white text-opacity-80 hover:bg-opacity-30 backdrop-blur-sm border border-white border-opacity-30'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4 pt-4">
              <button
                onClick={startNewGame}
                className="w-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white py-4 rounded-2xl font-black text-xl hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
              >
                🚀 START GAME
              </button>
              
              <button
                onClick={() => setGameState('leaderboard')}
                className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-white py-4 rounded-2xl font-black text-xl hover:from-amber-600 hover:via-yellow-600 hover:to-orange-600 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
              >
                🏆 LEADERBOARD
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'leaderboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient"></div>
        <div className="absolute top-20 right-20 w-64 h-64 bg-purple-500 opacity-10 rounded-full blur-3xl animate-pulse"></div>
        
        <div className="relative bg-white bg-opacity-10 backdrop-blur-xl rounded-3xl shadow-2xl p-10 max-w-4xl w-full border border-white border-opacity-20">
          <h1 className="text-5xl font-black text-center bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent mb-8">
            🏆 LEADERBOARD 🏆
          </h1>
          
          {leaderboard.length === 0 ? (
            <div className="text-center text-white text-opacity-70 py-12">
              <div className="text-6xl mb-6">🎯</div>
              <p className="text-2xl mb-4 font-bold">No Champions Yet!</p>
              <p className="text-lg">Complete your first puzzle to claim the throne.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-white text-opacity-80 mb-6 p-4 bg-gradient-to-r from-blue-500 to-indigo-500 bg-opacity-20 rounded-2xl backdrop-blur-sm border border-white border-opacity-20 text-center">
                <p className="font-bold text-white mb-2">💡 Hint Distribution:</p>
                <p>• 4×4: Easy(3), Medium(2), Hard(1)</p>
                <p>• 6×6: Easy(5), Medium(4), Hard(3)</p>
                <p>• 9×9: Easy(7), Medium(6), Hard(5)</p>
              </div>
              
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  <div className="md:hidden" style={{minWidth: '320px'}}>
                    <div className="grid grid-cols-6 gap-1 text-xs font-bold text-white text-opacity-90 pb-2 border-b-2 border-white border-opacity-30 text-center">
                      <div>🏅</div>
                      <div>📏 GRID</div>
                      <div>⚡ LEVEL</div>
                      <div>⏱️ TIME</div>
                      <div>💡</div>
                      <div>📅 DATE</div>
                    </div>
                    
                    {leaderboard.map((entry, index) => (
                      <div key={entry.id} className="grid grid-cols-6 gap-1 text-xs py-2 bg-white bg-opacity-5 my-2 rounded-lg border border-white border-opacity-10 text-center">
                        <div className={`font-black ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-blue-400'}`}>
                          #{index + 1}
                        </div>
                        <div className="text-white font-bold">{entry.gridSize}×{entry.gridSize}</div>
                        <div className="text-white capitalize font-bold text-xs">{entry.difficulty}</div>
                        <div className="text-white font-mono font-bold text-xs">{formatTime(entry.time)}</div>
                        <div className="text-white font-bold">{entry.hintsUsed}</div>
                        <div className="text-white text-opacity-80 text-xs">{entry.date}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="hidden md:block">
                    <div className="grid grid-cols-6 gap-4 text-sm font-bold text-white text-opacity-90 pb-4 border-b-2 border-white border-opacity-30 text-center">
                      <div>🏅 RANK</div>
                      <div>📏 GRID</div>
                      <div>⚡ LEVEL</div>
                      <div>⏱️ TIME</div>
                      <div>💡 HINTS</div>
                      <div>📅 DATE</div>
                    </div>
                    
                    {leaderboard.map((entry, index) => (
                      <div key={entry.id} className="grid grid-cols-6 gap-4 text-sm py-4 rounded-2xl bg-white bg-opacity-5 backdrop-blur-sm border border-white border-opacity-10 hover:bg-white hover:bg-opacity-10 transition-all duration-300 transform hover:scale-102 my-2 text-center">
                        <div className={`font-black text-lg ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-blue-400'}`}>
                          #{index + 1}
                        </div>
                        <div className="text-white font-bold">{entry.gridSize}×{entry.gridSize}</div>
                        <div className="text-white capitalize font-bold">{entry.difficulty}</div>
                        <div className="text-white font-mono font-bold">{formatTime(entry.time)}</div>
                        <div className="text-white font-bold">{entry.hintsUsed}</div>
                        <div className="text-white text-opacity-80">{entry.date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setGameState('menu')}
            className="w-full mt-8 bg-gradient-to-r from-slate-600 to-gray-700 text-white py-4 rounded-2xl font-black text-xl hover:from-slate-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-xl"
          >
            ⬅️ BACK TO MENU
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'gameOver') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-rose-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient"></div>
        <div className="absolute top-10 left-10 w-80 h-80 bg-red-500 opacity-10 rounded-full blur-3xl animate-pulse"></div>
        
        <div className="relative bg-white bg-opacity-10 backdrop-blur-xl rounded-3xl shadow-2xl p-10 max-w-lg w-full text-center border border-white border-opacity-20">
          <h1 className="text-5xl font-black text-transparent bg-gradient-to-r from-red-400 via-rose-400 to-pink-400 bg-clip-text mb-6">💀 GAME OVER!</h1>
          
          <div className="bg-gradient-to-br from-red-500 to-rose-500 bg-opacity-20 rounded-2xl p-6 mb-8 backdrop-blur-sm border border-red-300 border-opacity-20">
            <p className="text-2xl font-bold text-white mb-4">Lives Depleted! 💥</p>
            <div className="grid grid-cols-1 gap-3 text-white text-opacity-90 text-lg text-center">
              <div>📏 Grid: <span className="font-bold text-white">{gridSize}×{gridSize}</span></div>
              <div>⚡ Difficulty: <span className="font-bold text-white capitalize">{difficulty}</span></div>
              <div>💡 Hints Used: <span className="font-bold text-white">{hintsUsed}/{maxHints}</span></div>
              <div className="text-red-300 mt-4 font-bold">Keep practicing, champion! 🔥</div>
            </div>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={startNewGame}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-2xl font-black text-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              🔄 TRY AGAIN
            </button>
            <button
              onClick={() => setGameState('leaderboard')}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl font-black text-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              🏆 LEADERBOARD
            </button>
            <button
              onClick={() => setGameState('menu')}
              className="w-full bg-gradient-to-r from-slate-600 to-gray-700 text-white py-4 rounded-2xl font-black text-xl hover:from-slate-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              ⬅️ MENU
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'won') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-emerald-500 opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-teal-500 opacity-10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        
        <div className="relative bg-white bg-opacity-10 backdrop-blur-xl rounded-3xl shadow-2xl p-10 max-w-lg w-full text-center border border-white border-opacity-20">
          <h1 className="text-5xl font-black bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent mb-6">
            🎉 VICTORY! 🎉
          </h1>
          
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 bg-opacity-20 rounded-2xl p-6 mb-8 backdrop-blur-sm border border-emerald-300 border-opacity-20">
            <p className="text-2xl font-bold text-white mb-4">Puzzle Conquered! ⚡</p>
            <div className="grid grid-cols-1 gap-3 text-white text-opacity-90 text-lg text-center">
              <div>📏 Grid: <span className="font-bold text-white">{gridSize}×{gridSize}</span></div>
              <div>⚡ Difficulty: <span className="font-bold text-white capitalize">{difficulty}</span></div>
              <div>⏱️ Time: <span className="font-bold text-white">{completionTime ? formatTime(completionTime) : 'N/A'}</span></div>
              <div>💡 Hints Used: <span className="font-bold text-white">{hintsUsed}/{maxHints}</span></div>
              <div className="text-emerald-300 mt-4 font-bold">Outstanding performance! 🏆</div>
            </div>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={startNewGame}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-2xl font-black text-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              🎮 PLAY AGAIN
            </button>
            <button
              onClick={() => setGameState('leaderboard')}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl font-black text-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              🏆 LEADERBOARD
            </button>
            <button
              onClick={() => setGameState('menu')}
              className="w-full bg-gradient-to-r from-slate-600 to-gray-700 text-white py-4 rounded-2xl font-black text-xl hover:from-slate-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              ⬅️ MENU
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Playing state
  const { cellSize, fontSize } = getCellSize();
  const settings = getDifficultySettings(difficulty, gridSize);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-gradient"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 opacity-5 rounded-full blur-3xl animate-pulse"></div>
      
      <div className="max-w-6xl mx-auto relative">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white bg-opacity-10 backdrop-blur-xl rounded-2xl p-4 border border-white border-opacity-20 shadow-xl gap-4">
          <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
            <button
              onClick={() => setGameState('menu')}
              className="bg-gradient-to-r from-slate-600 to-gray-700 text-white px-4 py-2 rounded-xl font-bold hover:from-slate-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg text-sm whitespace-nowrap"
            >
              ⬅️ MENU
            </button>
            <div className="text-white font-bold text-sm md:text-base whitespace-nowrap">
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                {gridSize}×{gridSize} • {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500 bg-opacity-20 px-3 py-2 rounded-full border-2 border-emerald-400 border-opacity-30">
              <div className="w-5 h-5 border-2 border-emerald-500 rounded-full relative bg-gradient-to-br from-emerald-100 to-emerald-300 flex items-center justify-center">
                <div className="w-0.5 h-2 bg-emerald-700 absolute top-0.5 animate-spin origin-bottom"></div>
                <div className="w-1 h-1 bg-emerald-700 rounded-full absolute"></div>
              </div>
              <span className="text-white font-bold font-mono text-sm whitespace-nowrap">
                {formatTime(currentTime)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-red-400 font-bold text-sm">❤️ Lives:</span>
              <div className="flex gap-1">
                {Array.from({length: settings.lives}).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      i < lives ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/50' : 'bg-gray-600 opacity-50'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <button
              onClick={useHint}
              disabled={hintsUsed >= maxHints}
              className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 text-sm whitespace-nowrap ${
                hintsUsed >= maxHints
                  ? 'bg-gray-500 opacity-50 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:from-amber-600 hover:to-yellow-700 shadow-lg shadow-amber-500/30'
              }`}
            >
              💡 Hints: {maxHints - hintsUsed}
            </button>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <div 
            className="inline-block bg-white bg-opacity-20 backdrop-blur-xl rounded-3xl p-6 border-4 border-indigo-500 border-opacity-50 shadow-2xl shadow-indigo-500/30"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
              gap: '2px'
            }}
          >
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <input
                  key={`${rowIndex}-${colIndex}`}
                  type="number"
                  value={cell === 0 ? '' : cell}
                  onChange={(e) => {
                    const num = parseInt(e.target.value) || 0;
                    setSelectedCell({ row: rowIndex, col: colIndex });
                    handleNumberInput(num);
                  }}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  disabled={initialBoard[rowIndex][colIndex] !== 0 || lockedCells.has(`${rowIndex}-${colIndex}`)}
                  className={getCellClass(rowIndex, colIndex)}
                  min="1"
                  max={gridSize}
                  style={{
                    fontSize: `${fontSize}px`,
                    width: `${cellSize}px`,
                    height: `${cellSize}px`
                  }}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="bg-white bg-opacity-10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white border-opacity-20 w-full max-w-md">
            <div className="text-center text-white text-opacity-90 font-bold mb-6 text-lg">
              {selectedCell ? (
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  🎯 Selected: Row {selectedCell.row + 1}, Col {selectedCell.col + 1}
                </span>
              ) : (
                <span className="text-white text-opacity-70">✨ Select a cell to enter numbers</span>
              )}
            </div>
            <div 
              className="gap-3 justify-items-center"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(gridSize, 5)}, 1fr)`
              }}
            >
              {Array.from({length: gridSize}, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  onClick={() => handleNumberInput(num)}
                  disabled={!selectedCell}
                  className={`w-14 h-14 rounded-2xl font-black text-xl border-2 transition-all duration-300 transform hover:scale-110 ${
                    !selectedCell 
                      ? 'border-gray-500 bg-gray-600 bg-opacity-30 text-gray-500 cursor-not-allowed'
                      : 'border-blue-400 bg-gradient-to-br from-blue-500 to-indigo-600 bg-opacity-80 text-white hover:from-blue-400 hover:to-indigo-500 shadow-lg shadow-blue-500/30 backdrop-blur-sm'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SudokuGame;
                        