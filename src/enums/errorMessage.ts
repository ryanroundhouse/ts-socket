export enum ErrorMessage{
    NoUserIDProvided = "no userId provided",
    NoGamePopulationProvided = "no gamePopulation provided",
    NoGameIDProvided = "no gameId provided",
    NoNameProvided = "no name provided",
    NoGameSpecified = "no game provided",
    NoClaimProvided = "no claim provided",
    NoStartingPlayerProvided = "no starting player provided",
    NoMessageTypeProvided = "no messageType provided",
    NoConnectionListProvided = "no wsConnections provided",
    NoParticipantProvided = "no participant provided",
    NoMessageProvided = "no message provided",
    NotYourTurn = 'it\'s not your turn.',
    CanOnlyCheatClaim = 'can\'t call cheat if no one has made a claim.',
    ClaimTooLow = 'you need to make a claim of larger quantity than the last claim or call cheat.',
    ParticipantNotInConnectionList = "participantId not found in wsConnection list.",
    CantCreateNewGameWhenInGame = "player can't create a new game when already in a game.",
    GameNotFound = "game not found",
    CantJoinGameWhenInRunningGame = "player can't join a new game when already in a running game.",
    GameAlreadyStarted = "game already started.",
    MustBeInGameToStartGame = "you must be in the game to start the game.",
    NoGameMessagesFound = "no gameMessages.  Start the game before calculating starting player.",
    UnableToDetermineStartingPlayer = "Unable to determine starting player.",
    GameNotStarted = "game not started",
    GameAlreadyFinished = "game already finished.",
    MustHaveTwoOrMorePlayers = "must have 2 or more players.",
}