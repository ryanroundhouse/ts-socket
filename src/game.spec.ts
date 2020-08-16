process.env.NODE_ENV = 'test'
/* tslint:disable:no-unused-expression */

import "mocha";
import chai, { expect } from "chai";
import { Game } from "./game";
import { Result } from "./types/result";
import { GameInterface } from "./interfaces/game-interface";
import { Participant } from "./interfaces/participant";
import winston from "winston";
import WebSocket from "ws";
import { ErrorMessage } from "./enums/errorMessage";
import { GameMessage } from "./interfaces/game-message";
import { MessageType } from "./enums/messageType";
import { RoundResults } from "./interfaces/round-results";
import { Claim } from "./interfaces/claim";
import sinon from "sinon";

chai.should();

// create logger
const logger = winston.createLogger({
    transports: [
      new winston.transports.Console({ silent: true }),
    ],
  });

describe("game functionality", () => {
    describe("create game functionality", () => {
        it("can't create game if you don't provide a userID", () => {
            const game: Game = new Game(logger);
            const result: Result<string> = game.createGame(null, new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoUserIDProvided);
        });
        it("can't create game if you don't provide a gamePopulation", () => {
            const game: Game = new Game(logger);
            const result: Result<string> = game.createGame("100", null);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGamePopulationProvided);
        });
        it("can't create game if you're already in a game", () => {
            const playerId: string = "test";
            const participant: Participant = {
                userId: playerId,
                name: "test player",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const game: Game = new Game(logger);
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const gameWithPlayer: GameInterface = {
                started: false,
                finished: false,
                participants: [participant],
                gameMessageLog: []
            }
            gamePopulation.set("gameId", gameWithPlayer);
            const result: Result<string> = game.createGame(playerId, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.CantCreateNewGameWhenInGame);
        });
        it("can create game if you're not in a game", () => {
            const playerId: string = "test";
            const game: Game = new Game(logger);
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const result: Result<string> = game.createGame(playerId, gamePopulation);
            result.ok.should.be.true;
        });
        it("can create game if you're already in a game but it's finished", () => {
            const playerId: string = "test";
            const participant: Participant = {
                userId: playerId,
                name: "test player",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const game: Game = new Game(logger);
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const gameWithPlayer: GameInterface = {
                started: true,
                finished: true,
                participants: [participant],
                gameMessageLog: []
            }
            gamePopulation.set("gameId", gameWithPlayer);
            const result: Result<string> = game.createGame(playerId, gamePopulation);
            result.ok.should.be.true;
        });
        it("can create game while other games exist", () => {
            const playerId: string = "test";
            const otherPlayerId: string = "not test";
            const participant: Participant = {
                userId: otherPlayerId,
                name: "not test player",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const game: Game = new Game(logger);
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const gameWithPlayer: GameInterface = {
                started: true,
                finished: true,
                participants: [participant],
                gameMessageLog: []
            }
            gamePopulation.set("gameId", gameWithPlayer);
            const result: Result<string> = game.createGame(playerId, gamePopulation);
            result.ok.should.be.true;
        });
    });

    describe("join game functionality", () => {
        it("can't join game if you don't provide a userID", () => {
            const game: Game = new Game(logger);
            const result: Result<Participant[]> = game.joinGame(null, "gameId", "name", new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoUserIDProvided);
        });
        it("can't join game if you don't provide a gameID", () => {
            const game: Game = new Game(logger);
            const result: Result<Participant[]> = game.joinGame("userId", null, "name", new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGameIDProvided);
        });
        it("can't join game if you don't provide a name", () => {
            const game: Game = new Game(logger);
            const result: Result<Participant[]> = game.joinGame("userId", "gameId", null, new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoNameProvided);
        });
        it("can't join game if you don't provide a gamePopulation", () => {
            const game: Game = new Game(logger);
            const result: Result<Participant[]> = game.joinGame("userId", "gameId", "name", null);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGamePopulationProvided);
        });
        it("can't join game if it doesn't exist", () => {
            const game: Game = new Game(logger);
            const result: Result<Participant[]> = game.joinGame("userId", "gameId", "name", new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.GameNotFound);
        });
        it("can't join game if already in a game", () => {
            const playerId: string = "test";
            const participant: Participant = {
                userId: playerId,
                name: "not test player",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const game: Game = new Game(logger);
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const gameWithPlayer: GameInterface = {
                started: false,
                finished: false,
                participants: [participant],
                gameMessageLog: []
            }
            gamePopulation.set("gameId", gameWithPlayer);
            const result: Result<Participant[]> = game.joinGame(playerId, "gameId", "name", gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.CantJoinGameWhenInRunningGame);
        });
        it("can join game if games exist, but you're not in it", () => {
            const game: Game = new Game(logger);
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const emptyGame: GameInterface = {
                started: false,
                finished: false,
                participants: [],
                gameMessageLog: []
            }
            gamePopulation.set("gameId", emptyGame);
            const result: Result<Participant[]> = game.joinGame("userId", "gameId", "name", gamePopulation);
            result.ok.should.be.true;
        });
        it("can join game if games exist, participant in another game, but game is finished", () => {
            const playerId: string = "test";
            const participant: Participant = {
                userId: playerId,
                name: "not test player",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const game: Game = new Game(logger);
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const gameWithPlayer: GameInterface = {
                started: true,
                finished: true,
                participants: [participant],
                gameMessageLog: []
            }
            gamePopulation.set("gameId", gameWithPlayer);
            const result: Result<Participant[]> = game.joinGame(playerId, "gameId", "name", gamePopulation);
            result.ok.should.be.true;
        });
        it("can join game if games exist, but not a participant in another game", () => {
            const otherPlayerId: string = "not test";
            const participant: Participant = {
                userId: otherPlayerId,
                name: "not test player",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const game: Game = new Game(logger);
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const gameWithPlayer: GameInterface = {
                started: false,
                finished: false,
                participants: [participant],
                gameMessageLog: []
            }
            gamePopulation.set("gameId", gameWithPlayer);
            const result: Result<Participant[]> = game.joinGame("userId", "gameId", "name", gamePopulation);
            result.ok.should.be.true;
        });
        it("can join game if games exist, but player was already eliminated from their game", () => {
            const playerId: string = "not test";
            const participant: Participant = {
                userId: playerId,
                name: "not test player",
                numberOfDice: 5,
                roll: [],
                eliminated: true
            }
            const game: Game = new Game(logger);
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const gameWithPlayer: GameInterface = {
                started: true,
                finished: false,
                participants: [participant],
                gameMessageLog: []
            }
            gamePopulation.set("gameId", gameWithPlayer);
            const result: Result<Participant[]> = game.joinGame(playerId, "gameId", "name", gamePopulation);
            result.ok.should.be.true;
        });
    });
    describe("start game functionality", () => {
        it("can't start game if you don't provide a userID", () => {
            const game: Game = new Game(logger);
            const result: Result<string> = game.startGame(null, "gameId", new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoUserIDProvided);
        });
        it("can't start game if you don't provide a gameID", () => {
            const game: Game = new Game(logger);
            const result: Result<string> = game.startGame("userId", null, new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGameIDProvided);
        });
        it("can't start game if you don't provide a gamePopulation", () => {
            const game: Game = new Game(logger);
            const result: Result<string> = game.startGame("userId", "gameId", null);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGamePopulationProvided);
        });
        it("can't start game if it doesn't exist", () => {
            const game: Game = new Game(logger);
            const result: Result<string> = game.startGame("userId", "gameId", new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.GameNotFound);
        });
        it("can't start game if it's already started.", () => {
            const playerId: string = "test";
            const participant: Participant = {
                userId: playerId,
                name: "test player",
                numberOfDice: 5,
                roll: [],
                eliminated: true
            }
            const game: Game = new Game(logger);
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const gameWithPlayer: GameInterface = {
                started: true,
                finished: false,
                participants: [participant],
                gameMessageLog: []
            }
            gamePopulation.set("gameId", gameWithPlayer);
            const result: Result<string> = game.startGame("userId", "gameId", gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.GameAlreadyStarted);
        });
        it("can't start game if you're not in it.", () => {
            const playerId: string = "not test";
            const participant: Participant = {
                userId: playerId,
                name: "test player",
                numberOfDice: 5,
                roll: [],
                eliminated: true
            }
            const game: Game = new Game(logger);
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const gameWithPlayer: GameInterface = {
                started: false,
                finished: false,
                participants: [participant],
                gameMessageLog: []
            }
            gamePopulation.set("gameId", gameWithPlayer);
            const result: Result<string> = game.startGame("userId", "gameId", gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.MustBeInGameToStartGame);
        });
        it("can't start game if one or fewer players.", () => {
            const playerId: string = "test";
            const participant: Participant = {
                userId: playerId,
                name: "test player",
                numberOfDice: 5,
                roll: [],
                eliminated: true
            }
            const game: Game = new Game(logger);
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const gameWithPlayer: GameInterface = {
                started: false,
                finished: false,
                participants: [participant],
                gameMessageLog: []
            }
            gamePopulation.set("gameId", gameWithPlayer);
            const result: Result<string> = game.startGame(playerId, "gameId", gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.MustHaveTwoOrMorePlayers);
        });
        it("can start game.", () => {
            const firstPlayerId: string = "guid1";
            const secondPlayerId: string = "guid2";
            const gameId: string = "gameId";
            const firstParticipant: Participant = {
                userId: firstPlayerId,
                name: "first player",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const secondParticipant: Participant = {
                userId: secondPlayerId,
                name: "second player",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const game: Game = new Game(logger);
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const gameWithPlayer: GameInterface = {
                started: false,
                finished: false,
                participants: [firstParticipant, secondParticipant],
                gameMessageLog: []
            }
            gamePopulation.set(gameId, gameWithPlayer);
            const result: Result<string> = game.startGame(firstPlayerId, gameId, gamePopulation);
            result.ok.should.be.true;
            result.value.should.equal(gameId);
        });
    });
    describe("start Round tests", () => {
        it("can't start round if you don't provide a gameId", () => {
            const game: Game = new Game(logger);
            const result: Result<string> = game.startRound(null, new Map<string, GameInterface>(), new Map<string, WebSocket>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGameIDProvided);
        });
        it("can't start round if you don't provide a gamePopulation", () => {
            const game: Game = new Game(logger);
            const result: Result<string> = game.startRound("gameId", null, new Map<string, WebSocket>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGamePopulationProvided);
        });
        it("can't start round if you don't provide a webSocket connections list", () => {
            const game: Game = new Game(logger);
            const result: Result<string> = game.startRound("gameId", new Map<string, GameInterface>(), null);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoConnectionListProvided);
        });
        it("can't start round if game doesn't exist", () => {
            const game: Game = new Game(logger);
            const result: Result<string> = game.startRound("gameId", new Map<string, GameInterface>(), new Map<string, WebSocket>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.GameNotFound);
        });
    });
    describe("calculateStartingPlayer tests", () => {
        it("can't calculate starting player if no game provided.", () => {
            const game: Game = new Game(logger);
            const result: Result<Participant> = game.calculateStartingPlayer(null);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGameSpecified);
        });
        it("can't calculate starting player if no game messages found.", () => {
            const game: Game = new Game(logger);
            const gameInterface: GameInterface = {
                participants: [],
                started: false,
                finished: false,
                gameMessageLog: []
            };
            const result: Result<Participant> = game.calculateStartingPlayer(gameInterface);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGameMessagesFound);
        });
        it("can't calculate starting player if game not started.", () => {
            const game: Game = new Game(logger);
            const message: GameMessage = {
                messageType: MessageType.GameStarted,
                message: "game started"
            }
            const gameInterface: GameInterface = {
                participants: [],
                started: false,
                finished: false,
                gameMessageLog: [message]
            };
            const result: Result<Participant> = game.calculateStartingPlayer(gameInterface);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.GameNotStarted);
        });
        it("can't calculate starting player if game already finished.", () => {
            const game: Game = new Game(logger);
            const message: GameMessage = {
                messageType: MessageType.GameStarted,
                message: "game started"
            }
            const gameInterface: GameInterface = {
                participants: [],
                started: true,
                finished: true,
                gameMessageLog: [message]
            };
            const result: Result<Participant> = game.calculateStartingPlayer(gameInterface);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.GameAlreadyFinished);
        });
        it("can calculate starting player if at start of game.", () => {
            const game: Game = new Game(logger);
            const firstPlayerId: string = "guid1";
            const secondPlayerId: string = "guid2";
            const firstParticipant: Participant = {
                userId: firstPlayerId,
                name: "first player",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const secondParticipant: Participant = {
                userId: secondPlayerId,
                name: "second player",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const message: GameMessage = {
                messageType: MessageType.GameStarted,
                message: "game started"
            }
            const gameInterface: GameInterface = {
                participants: [firstParticipant, secondParticipant],
                started: true,
                finished: false,
                gameMessageLog: [message]
            };
            const result: Result<Participant> = game.calculateStartingPlayer(gameInterface);
            result.ok.should.be.true;
            expect([firstParticipant, secondParticipant]).to.include(result.value);
        });
        it("can calculate starting player if someone messes up.", () => {
            const game: Game = new Game(logger);
            const firstPlayerId: string = "guid1";
            const secondPlayerId: string = "guid2";
            const firstParticipant: Participant = {
                userId: firstPlayerId,
                name: "first player",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const secondParticipant: Participant = {
                userId: secondPlayerId,
                name: "second player",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const claim: Claim = {
                quantity: 0,
                value: 0,
                cheat: true
            }
            const roundResults: RoundResults = {
                callingPlayer: firstParticipant,
                calledPlayer: secondParticipant,
                claim,
                claimSuccess: true,
                playerEliminated: false
            }
            const message: GameMessage = {
                messageType: MessageType.RoundResults,
                message: roundResults
            }
            const gameInterface: GameInterface = {
                participants: [firstParticipant, secondParticipant],
                started: true,
                finished: false,
                gameMessageLog: [message]
            };
            const result: Result<Participant> = game.calculateStartingPlayer(gameInterface);
            result.ok.should.be.true;
            result.value.should.equal(secondParticipant);
        });
    });
    describe ("sendGameMessageToOne tests", () => {
        it("sendGameMessageToOne fails if no gameId", () => {
            const gameId: string = "gameId";
            const participantId: string = "participantId";
            const messageType: MessageType = MessageType.GameStarted;
            const message: string = "message";
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const wsConnections: Map<string, WebSocket> = new Map<string, WebSocket>();
            const game = new Game(null);

            const result: Result<string> = game.sendGameMessageToOne(null, participantId, messageType, message, gamePopulation, wsConnections);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGameIDProvided);
        });
        it("sendGameMessageToOne fails if no participantId", () => {
            const gameId: string = "gameId";
            const participantId: string = "participantId";
            const messageType: MessageType = MessageType.GameStarted;
            const message: string = "message";
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const wsConnections: Map<string, WebSocket> = new Map<string, WebSocket>();
            const game = new Game(null);

            const result: Result<string> = game.sendGameMessageToOne(gameId, null, messageType, message, gamePopulation, wsConnections);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoParticipantProvided);
        });
        it("sendGameMessageToOne fails if no messageType", () => {
            const gameId: string = "gameId";
            const participantId: string = "participantId";
            const messageType: MessageType = MessageType.GameStarted;
            const message: string = "message";
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const wsConnections: Map<string, WebSocket> = new Map<string, WebSocket>();
            const game = new Game(null);

            const result: Result<string> = game.sendGameMessageToOne(gameId, participantId, null, message, gamePopulation, wsConnections);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoMessageTypeProvided);
        });
        it("sendGameMessageToOne fails if no message", () => {
            const gameId: string = "gameId";
            const participantId: string = "participantId";
            const messageType: MessageType = MessageType.GameStarted;
            const message: string = "message";
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const wsConnections: Map<string, WebSocket> = new Map<string, WebSocket>();
            const game = new Game(null);

            const result: Result<string> = game.sendGameMessageToOne(gameId, participantId, messageType, null, gamePopulation, wsConnections);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoMessageProvided);
        });
        it("sendGameMessageToOne fails if no gamePopulation", () => {
            const gameId: string = "gameId";
            const participantId: string = "participantId";
            const messageType: MessageType = MessageType.GameStarted;
            const message: string = "message";
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const wsConnections: Map<string, WebSocket> = new Map<string, WebSocket>();
            const game = new Game(null);

            const result: Result<string> = game.sendGameMessageToOne(gameId, participantId, messageType, message, null, wsConnections);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGamePopulationProvided);
        });
        it("sendGameMessageToOne fails if no connection list", () => {
            const gameId: string = "gameId";
            const participantId: string = "participantId";
            const messageType: MessageType = MessageType.GameStarted;
            const message: string = "message";
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const wsConnections: Map<string, WebSocket> = new Map<string, WebSocket>();
            const game = new Game(null);

            const result: Result<string> = game.sendGameMessageToOne(gameId, participantId, messageType, message, gamePopulation, null);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoConnectionListProvided);
        });
        it("sendGameMessageToOne fails if gameId not in gamePopulation", () => {
            const gameId: string = "gameId";
            const participantId: string = "participantId";
            const messageType: MessageType = MessageType.GameStarted;
            const message: string = "message";
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const participant: Participant = {
                userId: "not participantId",
                name: "name",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const gameInterface: GameInterface = {
                started: false,
                finished: false,
                gameMessageLog: [],
                participants: [participant]
            }
            gamePopulation.set("some other gameId", gameInterface);
            const wsConnections: Map<string, WebSocket> = new Map<string, WebSocket>();
            const game = new Game(null);

            const result: Result<string> = game.sendGameMessageToOne(gameId, participantId, messageType, message, gamePopulation, wsConnections);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.GameNotFound);
        });
        it("sendGameMessageToOne fails if participant not in connection list", () => {
            const gameId: string = "gameId";
            const participantId: string = "participantId";
            const messageType: MessageType = MessageType.GameStarted;
            const message: string = "message";
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const participant: Participant = {
                userId: "not participantId",
                name: "name",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const gameInterface: GameInterface = {
                started: false,
                finished: false,
                gameMessageLog: [],
                participants: [participant]
            }
            gamePopulation.set(gameId, gameInterface);
            const wsConnections: Map<string, WebSocket> = new Map<string, WebSocket>();
            const game = new Game(null);

            const result: Result<string> = game.sendGameMessageToOne(gameId, participantId, messageType, message, gamePopulation, wsConnections);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.ParticipantNotInConnectionList);
        });
        it("sendGameMessageToOne adds gameMessage to gameMessageLog", () => {
            const gameId: string = "gameId";
            const participantId: string = "participantId";
            const messageType: MessageType = MessageType.GameStarted;
            const message: string = "message";
            const gameMessage: GameMessage = {
                messageType,
                message
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const participant: Participant = {
                userId: participantId,
                name: "name",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const gameInterface: GameInterface = {
                started: false,
                finished: false,
                gameMessageLog: [],
                participants: [participant]
            }
            gamePopulation.set(gameId, gameInterface);
            const webSocket = new WebSocket("ws://localhost");
            const webSocketStub = sinon.stub(webSocket);
            const wsConnections: Map<string, WebSocket> = new Map<string, WebSocket>();
            wsConnections.set(participantId, webSocket);
            const game = new Game(null);

            const result: Result<string> = game.sendGameMessageToOne(gameId, participantId, messageType, message, gamePopulation, wsConnections);
            result.ok.should.be.true;
            expect(webSocketStub.send.calledOnce).to.be.true;
            webSocketStub.send.firstCall.args[0].should.equal(JSON.stringify(gameMessage));
            result.value.should.equal("message sent.");
        });
    });
    describe ("generateDiceAndNotifyGameMessage tests", () => {
        it("generateDiceAndNotifyGameMessage fails if no gameId", () => {
            const startingPlayer: Participant = {
                userId: "userId",
                name: "name",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            };
            const gameId: string = "gameId";
            const messageType: MessageType = MessageType.GameStarted;
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const wsConnections: Map<string, WebSocket> = new Map<string, WebSocket>();
            const game = new Game(null);

            const result: Result<string> = game.generateDiceAndNotifyGameMessage(null, startingPlayer, messageType, gamePopulation, wsConnections);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGameIDProvided);
        });
        it("generateDiceAndNotifyGameMessage fails if no startingPlayer", () => {
            const startingPlayer: Participant = {
                userId: "userId",
                name: "name",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            };
            const gameId: string = "gameId";
            const messageType: MessageType = MessageType.GameStarted;
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const wsConnections: Map<string, WebSocket> = new Map<string, WebSocket>();
            const game = new Game(null);

            const result: Result<string> = game.generateDiceAndNotifyGameMessage(gameId, null, messageType, gamePopulation, wsConnections);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoStartingPlayerProvided);
        });
        it("generateDiceAndNotifyGameMessage fails if no messageType", () => {
            const startingPlayer: Participant = {
                userId: "userId",
                name: "name",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            };
            const gameId: string = "gameId";
            const messageType: MessageType = MessageType.GameStarted;
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const wsConnections: Map<string, WebSocket> = new Map<string, WebSocket>();
            const game = new Game(null);

            const result: Result<string> = game.generateDiceAndNotifyGameMessage(gameId, startingPlayer, null, gamePopulation, wsConnections);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoMessageTypeProvided);
        });
        it("generateDiceAndNotifyGameMessage fails if no gamePopulation", () => {
            const startingPlayer: Participant = {
                userId: "userId",
                name: "name",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            };
            const gameId: string = "gameId";
            const messageType: MessageType = MessageType.GameStarted;
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const wsConnections: Map<string, WebSocket> = new Map<string, WebSocket>();
            const game = new Game(null);

            const result: Result<string> = game.generateDiceAndNotifyGameMessage(gameId, startingPlayer, messageType, null, wsConnections);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGamePopulationProvided);
        });
        it("generateDiceAndNotifyGameMessage fails if no connection list", () => {
            const startingPlayer: Participant = {
                userId: "userId",
                name: "name",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            };
            const gameId: string = "gameId";
            const messageType: MessageType = MessageType.GameStarted;
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const wsConnections: Map<string, WebSocket> = new Map<string, WebSocket>();
            const game = new Game(null);

            const result: Result<string> = game.generateDiceAndNotifyGameMessage(gameId, startingPlayer, messageType, gamePopulation, null);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoConnectionListProvided);
        });
        it("generateDiceAndNotifyGameMessage fails if no connection list", () => {
            const startingPlayer: Participant = {
                userId: "userId",
                name: "name",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            };
            const gameId: string = "gameId";
            const messageType: MessageType = MessageType.GameStarted;
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const wsConnections: Map<string, WebSocket> = new Map<string, WebSocket>();

            const nextPlayer: Participant = {
                userId: "nextUserId",
                name: "next name",
                numberOfDice: 3,
                roll: [],
                eliminated: false
            }
            const gameInterface: GameInterface = {
                started: false,
                finished: false,
                gameMessageLog: [],
                participants: [startingPlayer, nextPlayer]
            }
            gamePopulation.set(gameId, gameInterface);
            const startingWebSocket = new WebSocket("ws://localhost");
            const nextWebSocket = new WebSocket("ws://localhost");
            const startingPlayerWebSocketStub = sinon.stub(startingWebSocket);
            const nextPlayerWebSocketStub = sinon.stub(nextWebSocket);
            wsConnections.set(startingPlayer.userId, startingWebSocket);
            wsConnections.set(nextPlayer.userId, nextWebSocket);

            const game = new Game(null);
            const result: Result<string> = game.generateDiceAndNotifyGameMessage(gameId, startingPlayer, messageType, gamePopulation, wsConnections);
            result.ok.should.be.true;
            expect(startingPlayerWebSocketStub.send.calledOnce).to.be.true;

            const startingPlayerMessage = JSON.parse(startingPlayerWebSocketStub.send.firstCall.args[0]);
            const nextPlayerMessage = JSON.parse(nextPlayerWebSocketStub.send.firstCall.args[0]);
            expect(startingPlayerWebSocketStub.send.calledOnce).to.be.true;
            expect(nextPlayerWebSocketStub.send.calledOnce).to.be.true;
            startingPlayerMessage.message.startingPlayer.should.equal(true);
            nextPlayerMessage.message.startingPlayer.should.equal(false);
            startingPlayerMessage.message.participant.roll.length.should.equal(startingPlayer.numberOfDice);
            nextPlayerMessage.message.participant.roll.length.should.equal(nextPlayer.numberOfDice);
            startingPlayerMessage.messageType.should.equal(MessageType.RoundStarted);
            nextPlayerMessage.messageType.should.equal(MessageType.RoundStarted);
            result.ok.should.be.true;
            result.message.should.equal("messages sent");
        });
    });
});