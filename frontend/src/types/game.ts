// src/types/game.ts

export type Team = 'A' | 'B';
export type PlayerRole = 'spymaster' | 'operative';
export type GamePhase = 'waiting' | 'giving_clue' | 'guessing' | 'ended';

export interface CardState {
    word: string;
    // O backend envia 'hidden' para agentes antes de revelar
    color: 'blue' | 'red' | 'neutral' | 'assassin' | 'hidden';
    revealed: boolean;
}

export interface PlayerState {
    id: string;
    username: string;
    team?: Team;
    role?: PlayerRole;
}

export interface GameState {
    players: PlayerState[];
    board: CardState[];
    currentTurn: Team;
    gamePhase: GamePhase;
    currentClue: { word: string; count: number } | null;
    guessesRemaining: number;
    scores: { A: number; B: number };
    winner: Team | null;
    creatorId: string;
    turnTimeRemaining: number | null;
    log: string[]; 
}