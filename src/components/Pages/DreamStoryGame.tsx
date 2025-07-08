import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, VolumeX, Clock, Moon, Sun, Zap, Heart, Coffee, Dumbbell, Droplets, Sparkles } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface DreamStoryGameProps {
  onBack: () => void;
}

interface GameState {
  energy: number;
  happiness: number;
  health: number;
  sleepQuality: number;
  currentRoom: string;
  gameTime: Date;
  dayOfWeek: string;
  isPlaying: boolean;
  isPaused: boolean;
  gameSpeed: number;
  usedObjects: Set<string>;
  completedActivities: string[];
  notifications: string[];
  gameStyle: '2d' | 'isometric';
  soundEnabled: boolean;
}

interface Activity {
  id: string;
  name: string;
  room: string;
  energyCost: number;
  energyGain: number;
  happinessGain: number;
  healthGain: number;
  sleepQualityGain: number;
  duration: number; // em minutos do jogo
  description: string;
  icon: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | 'any';
}

const DreamStoryGame: React.FC<DreamStoryGameProps> = ({ onBack }) => {
  const { isDark } = useTheme();
  
  // Dias da semana em português
  const daysOfWeek = [
    'Segunda-feira',
    'Terça-feira', 
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo'
  ];

  // Estado inicial do jogo - sempre começa numa segunda-feira às 07:30
  const getInitialGameState = (): GameState => {
    const startTime = new Date();
    startTime.setHours(7, 30, 0, 0); // 07:30 da manhã
    
    return {
      energy: 80,
      happiness: 70,
      health: 75,
      sleepQuality: 60,
      currentRoom: 'bedroom',
      gameTime: startTime,
      dayOfWeek: 'Segunda-feira', // Sempre começa numa segunda-feira
      isPlaying: false,
      isPaused: false,
      gameSpeed: 1,
      usedObjects: new Set(),
      completedActivities: [],
      notifications: ['Bem-vindo ao Dream Story! Comece sua jornada para um sono melhor.'],
      gameStyle: '2d',
      soundEnabled: true
    };
  };

  const [gameState, setGameState] = useState<GameState>(getInitialGameState);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const activities: Activity[] = [
    // Bedroom
    { id: 'sleep', name: 'Dormir', room: 'bedroom', energyCost: 0, energyGain: 40, happinessGain: 10, healthGain: 15, sleepQualityGain: 30, duration: 480, description: 'Uma boa noite de sono restaurador', icon: '😴', timeOfDay: 'night' },
    { id: 'computer', name: 'Usar Computador', room: 'bedroom', energyCost: 10, energyGain: 0, happinessGain: 15, healthGain: -5, sleepQualityGain: -10, duration: 60, description: 'Trabalhar ou se divertir no computador', icon: '💻' },
    { id: 'wardrobe', name: 'Escolher Roupa', room: 'bedroom', energyCost: 5, energyGain: 0, happinessGain: 10, healthGain: 0, sleepQualityGain: 0, duration: 15, description: 'Escolher a roupa perfeita para o dia', icon: '👔' },
    { id: 'bedroom-mirror', name: 'Se Arrumar', room: 'bedroom', energyCost: 5, energyGain: 0, happinessGain: 15, healthGain: 5, sleepQualityGain: 0, duration: 20, description: 'Cuidar da aparência e autoestima', icon: '✨' },

    // Living Room
    { id: 'sofa', name: 'Relaxar no Sofá', room: 'living', energyCost: 0, energyGain: 15, happinessGain: 20, healthGain: 5, sleepQualityGain: 10, duration: 45, description: 'Momento de relaxamento e descanso', icon: '😌' },
    { id: 'tv', name: 'Assistir TV', room: 'living', energyCost: 5, energyGain: 0, happinessGain: 25, healthGain: -5, sleepQualityGain: -5, duration: 90, description: 'Entretenimento e diversão', icon: '📺' },
    { id: 'bookshelf', name: 'Ler Livro', room: 'living', energyCost: 10, energyGain: 0, happinessGain: 20, healthGain: 5, sleepQualityGain: 15, duration: 60, description: 'Expandir conhecimento e relaxar a mente', icon: '📚' },
    { id: 'videogame', name: 'Jogar Videogame', room: 'living', energyCost: 15, energyGain: 0, happinessGain: 30, healthGain: -10, sleepQualityGain: -15, duration: 120, description: 'Diversão e entretenimento digital', icon: '🎮' },

    // Kitchen
    { id: 'table', name: 'Fazer Refeição', room: 'kitchen', energyCost: 0, energyGain: 25, happinessGain: 15, healthGain: 20, sleepQualityGain: 5, duration: 30, description: 'Nutrir o corpo com uma refeição saudável', icon: '🍽️' },
    { id: 'fridge', name: 'Buscar Lanche', room: 'kitchen', energyCost: 5, energyGain: 10, happinessGain: 10, healthGain: 5, sleepQualityGain: 0, duration: 10, description: 'Um lanche rápido para matar a fome', icon: '🥪' },
    { id: 'stove', name: 'Cozinhar', room: 'kitchen', energyCost: 20, energyGain: 0, happinessGain: 25, healthGain: 15, sleepQualityGain: 5, duration: 45, description: 'Preparar uma refeição deliciosa', icon: '👨‍🍳' },
    { id: 'microwave', name: 'Esquentar Comida', room: 'kitchen', energyCost: 5, energyGain: 15, happinessGain: 5, healthGain: 10, sleepQualityGain: 0, duration: 5, description: 'Refeição rápida e prática', icon: '🔥' },
    { id: 'water', name: 'Beber Água', room: 'kitchen', energyCost: 0, energyGain: 5, happinessGain: 5, healthGain: 15, sleepQualityGain: 10, duration: 2, description: 'Hidratação essencial para o corpo', icon: '💧' },

    // Gym
    { id: 'exercise', name: 'Levantar Peso', room: 'gym', energyCost: 30, energyGain: 0, happinessGain: 20, healthGain: 25, sleepQualityGain: 20, duration: 60, description: 'Fortalecer músculos e melhorar condicionamento', icon: '💪' },
    { id: 'treadmill', name: 'Correr na Esteira', room: 'gym', energyCost: 25, energyGain: 0, happinessGain: 25, healthGain: 30, sleepQualityGain: 25, duration: 45, description: 'Exercício cardiovascular energizante', icon: '🏃‍♂️' },
    { id: 'dumbbells', name: 'Exercício com Halteres', room: 'gym', energyCost: 20, energyGain: 0, happinessGain: 15, healthGain: 20, sleepQualityGain: 15, duration: 30, description: 'Treino focado em grupos musculares', icon: '🏋️‍♂️' },
    { id: 'yoga-mat', name: 'Yoga e Meditação', room: 'gym', energyCost: 10, energyGain: 20, happinessGain: 30, healthGain: 15, sleepQualityGain: 35, duration: 45, description: 'Relaxamento e conexão mente-corpo', icon: '🧘‍♂️' },

    // Bathroom
    { id: 'shower', name: 'Tomar Banho', room: 'bathroom', energyCost: 5, energyGain: 15, happinessGain: 20, healthGain: 15, sleepQualityGain: 10, duration: 20, description: 'Higiene e relaxamento', icon: '🚿' },
    { id: 'bathroom-sink', name: 'Escovar Dentes', room: 'bathroom', energyCost: 5, energyGain: 0, happinessGain: 10, healthGain: 15, sleepQualityGain: 5, duration: 5, description: 'Cuidados com higiene bucal', icon: '🦷' },
    { id: 'toilet', name: 'Usar Banheiro', room: 'bathroom', energyCost: 0, energyGain: 5, happinessGain: 5, healthGain: 5, sleepQualityGain: 0, duration: 5, description: 'Necessidades básicas', icon: '🚽' },
    { id: 'skincare', name: 'Cuidados com a Pele', room: 'bathroom', energyCost: 10, energyGain: 0, happinessGain: 25, healthGain: 10, sleepQualityGain: 5, duration: 15, description: 'Rotina de beleza e autocuidado', icon: '🧴' }
  ];

  const rooms = [
    { id: 'bedroom', name: 'Quarto', icon: '🛏️' },
    { id: 'living', name: 'Sala', icon: '🛋️' },
    { id: 'kitchen', name: 'Cozinha', icon: '🍳' },
    { id: 'gym', name: 'Academia', icon: '💪' },
    { id: 'bathroom', name: 'Banheiro', icon: '🚿' }
  ];

  // Função para obter o dia da semana baseado na data do jogo
  const getDayOfWeek = (gameTime: Date): string => {
    // Calcular quantos dias se passaram desde o início (segunda-feira)
    const startTime = new Date();
    startTime.setHours(7, 30, 0, 0);
    
    const daysDiff = Math.floor((gameTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24));
    const dayIndex = daysDiff % 7;
    
    return daysOfWeek[dayIndex];
  };

  // Função para avançar o tempo do jogo
  const advanceTime = (minutes: number) => {
    setGameState(prev => {
      const newTime = new Date(prev.gameTime);
      newTime.setMinutes(newTime.getMinutes() + minutes);
      
      // Verificar se passou da meia-noite (00:00)
      const dayChanged = newTime.getDate() !== prev.gameTime.getDate() || 
                        (newTime.getHours() === 0 && prev.gameTime.getHours() === 23);
      
      let newDayOfWeek = prev.dayOfWeek;
      if (dayChanged) {
        newDayOfWeek = getDayOfWeek(newTime);
      }

      return {
        ...prev,
        gameTime: newTime,
        dayOfWeek: newDayOfWeek
      };
    });
  };

  // Game loop
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
      gameLoopRef.current = setInterval(() => {
        advanceTime(1 * gameState.gameSpeed); // Avança 1 minuto do jogo por segundo real
        
        // Degradação natural dos stats ao longo do tempo
        setGameState(prev => ({
          ...prev,
          energy: Math.max(0, prev.energy - 0.1),
          happiness: Math.max(0, prev.happiness - 0.05),
          health: Math.max(0, prev.health - 0.02),
          sleepQuality: Math.max(0, prev.sleepQuality - 0.03)
        }));
      }, 1000 / gameState.gameSpeed);
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isPaused, gameState.gameSpeed]);

  const startGame = () => {
    setGameState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
  };

  const pauseGame = () => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const resetGame = () => {
    setGameState(getInitialGameState());
  };

  const changeRoom = (roomId: string) => {
    setGameState(prev => ({ ...prev, currentRoom: roomId }));
  };

  const performActivity = (activity: Activity) => {
    if (gameState.usedObjects.has(activity.id)) return;

    // Verificar se tem energia suficiente
    if (gameState.energy < activity.energyCost) {
      setGameState(prev => ({
        ...prev,
        notifications: [...prev.notifications, `Energia insuficiente para ${activity.name}!`]
      }));
      return;
    }

    // Aplicar efeitos da atividade
    setGameState(prev => ({
      ...prev,
      energy: Math.min(100, Math.max(0, prev.energy - activity.energyCost + activity.energyGain)),
      happiness: Math.min(100, Math.max(0, prev.happiness + activity.happinessGain)),
      health: Math.min(100, Math.max(0, prev.health + activity.healthGain)),
      sleepQuality: Math.min(100, Math.max(0, prev.sleepQuality + activity.sleepQualityGain)),
      usedObjects: new Set([...prev.usedObjects, activity.id]),
      completedActivities: [...prev.completedActivities, activity.id],
      notifications: [...prev.notifications, `${activity.description} (+${activity.happinessGain} felicidade)`]
    }));

    // Avançar tempo da atividade
    advanceTime(activity.duration);

    // Remover objeto usado após um tempo
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        usedObjects: new Set([...prev.usedObjects].filter(id => id !== activity.id))
      }));
    }, 30000); // 30 segundos
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getTimeOfDayIcon = (date: Date): string => {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return '🌅';
    if (hour >= 12 && hour < 18) return '☀️';
    if (hour >= 18 && hour < 22) return '🌆';
    return '🌙';
  };

  const getStatColor = (value: number): string => {
    if (value >= 80) return 'text-emerald-400';
    if (value >= 60) return 'text-yellow-400';
    if (value >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getStatBgColor = (value: number): string => {
    if (value >= 80) return 'bg-emerald-500';
    if (value >= 60) return 'bg-yellow-500';
    if (value >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const currentRoomActivities = activities.filter(activity => activity.room === gameState.currentRoom);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950' 
        : 'bg-gradient-to-br from-white via-emerald-50/80 to-emerald-100/60'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-sm border-b transition-colors duration-300 ${
        isDark 
          ? 'bg-slate-900/95 border-slate-800' 
          : 'bg-white/95 border-gray-200'
      }`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className={`p-2 rounded-full transition-colors ${
                isDark 
                  ? 'hover:bg-slate-800 text-white' 
                  : 'hover:bg-gray-100 text-gray-900'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h1 className={`text-lg font-bold transition-colors duration-300 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Dream Story</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setGameState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                className={`p-2 rounded-full transition-colors ${
                  isDark 
                    ? 'hover:bg-slate-800 text-slate-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                {gameState.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 max-w-6xl mx-auto">
        {/* Game Status Bar */}
        <div className={`backdrop-blur-sm rounded-2xl p-4 border mb-6 transition-colors duration-300 ${
          isDark 
            ? 'bg-slate-900/50 border-slate-800' 
            : 'bg-white/80 border-gray-200 shadow-sm'
        }`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* Day of Week - Substituindo "Dia X" */}
            <div className="text-center">
              <div className={`text-lg font-bold mb-1 transition-colors duration-300 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                {gameState.dayOfWeek}
              </div>
              <div className={`text-sm transition-colors duration-300 ${
                isDark ? 'text-slate-400' : 'text-gray-600'
              }`}>
                {getTimeOfDayIcon(gameState.gameTime)} {formatTime(gameState.gameTime)}
              </div>
            </div>

            {/* Stats */}
            <div className="text-center">
              <div className={`flex items-center justify-center gap-1 mb-1 ${getStatColor(gameState.energy)}`}>
                <Zap className="w-4 h-4" />
                <span className="font-bold">{Math.round(gameState.energy)}</span>
              </div>
              <div className={`text-xs transition-colors duration-300 ${
                isDark ? 'text-slate-400' : 'text-gray-600'
              }`}>Energia</div>
            </div>

            <div className="text-center">
              <div className={`flex items-center justify-center gap-1 mb-1 ${getStatColor(gameState.happiness)}`}>
                <Heart className="w-4 h-4" />
                <span className="font-bold">{Math.round(gameState.happiness)}</span>
              </div>
              <div className={`text-xs transition-colors duration-300 ${
                isDark ? 'text-slate-400' : 'text-gray-600'
              }`}>Felicidade</div>
            </div>

            <div className="text-center">
              <div className={`flex items-center justify-center gap-1 mb-1 ${getStatColor(gameState.sleepQuality)}`}>
                <Moon className="w-4 h-4" />
                <span className="font-bold">{Math.round(gameState.sleepQuality)}</span>
              </div>
              <div className={`text-xs transition-colors duration-300 ${
                isDark ? 'text-slate-400' : 'text-gray-600'
              }`}>Sono</div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Energia', value: gameState.energy, icon: Zap },
              { label: 'Felicidade', value: gameState.happiness, icon: Heart },
              { label: 'Saúde', value: gameState.health, icon: Coffee },
              { label: 'Sono', value: gameState.sleepQuality, icon: Moon }
            ].map((stat, index) => (
              <div key={index}>
                <div className={`rounded-full h-2 transition-colors duration-300 ${
                  isDark ? 'bg-slate-800' : 'bg-gray-200'
                }`}>
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getStatBgColor(stat.value)}`}
                    style={{ width: `${stat.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Controls */}
        <div className={`backdrop-blur-sm rounded-2xl p-4 border mb-6 transition-colors duration-300 ${
          isDark 
            ? 'bg-slate-900/50 border-slate-800' 
            : 'bg-white/80 border-gray-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-center gap-4">
            {!gameState.isPlaying ? (
              <button
                onClick={startGame}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Iniciar Jogo
              </button>
            ) : (
              <>
                <button
                  onClick={pauseGame}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                    gameState.isPaused
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  }`}
                >
                  {gameState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  {gameState.isPaused ? 'Continuar' : 'Pausar'}
                </button>
                
                <button
                  onClick={resetGame}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                    isDark 
                      ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reiniciar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Room Navigation */}
        <div className={`backdrop-blur-sm rounded-2xl p-4 border mb-6 transition-colors duration-300 ${
          isDark 
            ? 'bg-slate-900/50 border-slate-800' 
            : 'bg-white/80 border-gray-200 shadow-sm'
        }`}>
          <h3 className={`text-lg font-bold mb-4 transition-colors duration-300 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>Ambientes</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => changeRoom(room.id)}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  gameState.currentRoom === room.id
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <div className="text-2xl mb-1">{room.icon}</div>
                <div className="text-sm font-medium">{room.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Game Area */}
        <div className={`backdrop-blur-sm rounded-2xl border mb-6 overflow-hidden transition-colors duration-300 ${
          isDark 
            ? 'bg-slate-900/50 border-slate-800' 
            : 'bg-white/80 border-gray-200 shadow-sm'
        }`}>
          {/* Room Display */}
          <div className="relative h-80 pixel-game-container">
            <div className={`pixel-room room-${gameState.currentRoom} h-full`}>
              <div className={`pixel-room-bg room-bg-${gameState.currentRoom}`}></div>
              
              {/* Character */}
              <div className="pixel-character">
                <div className={`alex-sprite-2d ${gameState.isPlaying && !gameState.isPaused ? 'alex-idle-2d' : ''}`}></div>
                <div className="character-shadow-2d"></div>
              </div>

              {/* Interactive Objects */}
              {currentRoomActivities.map((activity) => (
                <div
                  key={activity.id}
                  className={`pixel-object pixel-${activity.id} ${
                    gameState.usedObjects.has(activity.id) ? 'used' : 'available'
                  }`}
                  onClick={() => performActivity(activity)}
                  title={activity.description}
                >
                  {gameState.completedActivities.includes(activity.id) && (
                    <div className="pixel-completion">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activities Panel */}
          <div className="p-4 border-t border-slate-800">
            <h4 className={`text-lg font-bold mb-3 transition-colors duration-300 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Atividades Disponíveis - {rooms.find(r => r.id === gameState.currentRoom)?.name}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentRoomActivities.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => performActivity(activity)}
                  disabled={gameState.usedObjects.has(activity.id) || gameState.energy < activity.energyCost}
                  className={`p-3 rounded-xl text-left transition-all duration-200 ${
                    gameState.usedObjects.has(activity.id)
                      ? isDark
                        ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                        : 'bg-gray-100/50 text-gray-400 cursor-not-allowed'
                      : gameState.energy < activity.energyCost
                        ? isDark
                          ? 'bg-red-900/30 text-red-400 cursor-not-allowed'
                          : 'bg-red-100/50 text-red-600 cursor-not-allowed'
                        : isDark
                          ? 'bg-slate-800 hover:bg-slate-700 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{activity.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{activity.name}</div>
                      <div className={`text-sm transition-colors duration-300 ${
                        isDark ? 'text-slate-400' : 'text-gray-600'
                      }`}>
                        {activity.description}
                      </div>
                      <div className={`text-xs mt-1 transition-colors duration-300 ${
                        isDark ? 'text-slate-500' : 'text-gray-500'
                      }`}>
                        Energia: -{activity.energyCost} | Duração: {activity.duration}min
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        {gameState.notifications.length > 0 && (
          <div className={`backdrop-blur-sm rounded-2xl p-4 border transition-colors duration-300 ${
            isDark 
              ? 'bg-slate-900/50 border-slate-800' 
              : 'bg-white/80 border-gray-200 shadow-sm'
          }`}>
            <h4 className={`text-lg font-bold mb-3 transition-colors duration-300 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>Atividades Recentes</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {gameState.notifications.slice(-5).reverse().map((notification, index) => (
                <div
                  key={index}
                  className={`text-sm p-2 rounded-lg transition-colors duration-300 ${
                    isDark 
                      ? 'bg-slate-800/50 text-slate-300' 
                      : 'bg-gray-100/50 text-gray-700'
                  }`}
                >
                  {notification}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DreamStoryGame;