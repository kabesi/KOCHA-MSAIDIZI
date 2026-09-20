export interface Team {
  id: string;
  name: string;
  description?: string;
  coachIds: string[]; // List of user UIDs
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  phone: string;
  position?: string;
  number?: number;
  age?: number;
  preferredFoot?: 'Right' | 'Left' | 'Both';
  weight?: string | number; // e.g. "72 kg"
  height?: string | number; // e.g. "178 cm"
  occupation?: string; // e.g. "Software Engineer", "Student"
  coachInsights?: string; // Tactical notes, development areas, work ethic
  photoUrl?: string;
}

export interface Drill {
  title: string;
  description: string;
  imageUrl?: string;
}

export interface DrillLibraryItem extends Drill {
  id: string;
  teamId?: string; // Optional: global drills if no teamId
  category?: string;
}

export interface Practice {
  id: string;
  teamId: string;
  date: any; // Firestore Timestamp
  title: string;
  description: string;
  warmup: Drill[];
  mainBody: Drill[];
  finalGame: Drill[];
  coolDown: Drill[];
  attendees: string[]; // Array of player IDs
  squadPhotoUrl?: string;
}

export interface League {
  id: string;
  teamId?: string; // Optional: team-specific or global
  name: string;
  description?: string;
  leagueType?: 'point_based' | 'group_stage';
  groups?: string[]; // e.g. ['Group A', 'Group B']
  qualifiersPerGroup?: number; // e.g. 2 (Winner & Runner-up)
  hasKnockoutStage?: boolean;
  advancementFormat?: string;
  wildcardCount?: number;
  totalAdvancing?: number;
}

export interface MatchGoal {
  id: string;
  playerId?: string;
  playerName: string;
  minute: number;
  team: 'home' | 'away'; // 'home' is my team, 'away' is opponent
  assistPlayerId?: string;
  assistPlayerName?: string;
  goalType?: 'open_play' | 'penalty' | 'free_kick' | 'header' | 'counter_attack' | 'own_goal';
}

export interface MatchAssist {
  id: string;
  playerId?: string;
  playerName: string;
  minute?: number;
  team: 'home' | 'away';
  goalId?: string;
  notes?: string;
}

export interface MatchCard {
  id: string;
  playerId?: string;
  playerName: string;
  minute: number;
  cardType: 'yellow' | 'red';
  team: 'home' | 'away';
  reason?: string; // e.g. "Tactical Foul", "Dissent", "Second Yellow", "Serious Foul Play"
}

export interface MatchStats {
  possessionHome?: number; // e.g. 55 (%)
  possessionAway?: number; // e.g. 45 (%)
  shotsHome?: number;
  shotsAway?: number;
  shotsOnTargetHome?: number;
  shotsOnTargetAway?: number;
  cornersHome?: number;
  cornersAway?: number;
  foulsHome?: number;
  foulsAway?: number;
  // Legacy team card fields (optional backward compatibility)
  yellowCardsHome?: number;
  yellowCardsAway?: number;
  redCardsHome?: number;
  redCardsAway?: number;
  // Individual Player Match Event Tracking
  goals?: MatchGoal[];
  assists?: MatchAssist[];
  cards?: MatchCard[];
  playerOfTheMatch?: string;
  playerOfTheMatchId?: string;
  notes?: string;
}

export interface Match {
  id: string;
  teamId: string;
  date: any; // Firestore Timestamp
  opponent: string;
  homeTeamName?: string;
  awayTeamName?: string;
  location: string;
  matchType?: 'league' | 'friendly';
  leagueId?: string;
  leagueName?: string;
  groupName?: string; // e.g. "Group A", "Group B", or "Knockout"
  stage?: 'group' | 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final' | 'third_place' | 'playoff' | 'preliminary' | string;
  homePlaceholder?: string; // e.g. "Winner Group A", "Winner QF1", "Winner Match #201"
  awayPlaceholder?: string; // e.g. "2nd Place Group B", "Winner QF2"
  homeResolvedTeam?: string; // e.g. "Chelsea FC" (automatically evaluated or locked in)
  awayResolvedTeam?: string; // e.g. "Arsenal FC"
  sourceMatchHomeId?: string;
  sourceMatchAwayId?: string;
  matchNumber?: string; // Admin created fixture match number e.g. "Match #101"
  fixtureRound?: string; // e.g. "Round 1", "Matchday 5", "Quarter-Final 1", "Semi-Final", "Final"
  status?: 'scheduled' | 'postponed' | 'completed' | 'live';
  score?: string; // e.g. "2 - 1" or "2 - 2 (4 - 3 pens)"
  homeScore?: number;
  awayScore?: number;
  opponentScore?: number;
  penaltyScore?: string; // e.g. "4 - 3"
  penaltyWinner?: 'home' | 'away' | string;
  stats?: MatchStats;
  attendees: string[]; // Array of player IDs
  teamPhotoUrl?: string;
  lineup?: {
    formation: string;
    startingXI: {
      playerId: string;
      position: string;
      x: number;
      y: number;
    }[];
    substitutes: string[]; // Array of player IDs
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'coach' | 'data_user';
  teamIds?: string[]; // Teams assigned to this user (for coaches)
}
