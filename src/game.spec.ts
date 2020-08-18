process.env.NODE_ENV = 'test'
/* tslint:disable:no-unused-expression */

import "mocha";
import chai, { expect, assert } from "chai";
import { Game } from "./game";
import { Messenger } from "./messenger";
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
import { GameOver } from "./interfaces/game-over";

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
            const game: Game = new Game(logger, new Messenger());
            const result: Result<string> = game.createGame(null, new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoUserIDProvided);
        });
        it("can't create game if you don't provide a gamePopulation", () => {
            const game: Game = new Game(logger, new Messenger());
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
            const game: Game = new Game(logger, new Messenger());
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
            const game: Game = new Game(logger, new Messenger());
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
            const game: Game = new Game(logger, new Messenger());
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
            const game: Game = new Game(logger, new Messenger());
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
            const game: Game = new Game(logger, new Messenger());
            const result: Result<Participant[]> = game.joinGame(null, "gameId", "name", new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoUserIDProvided);
        });
        it("can't join game if you don't provide a gameID", () => {
            const game: Game = new Game(logger, new Messenger());
            const result: Result<Participant[]> = game.joinGame("userId", null, "name", new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGameIDProvided);
        });
        it("can't join game if you don't provide a name", () => {
            const game: Game = new Game(logger, new Messenger());
            const result: Result<Participant[]> = game.joinGame("userId", "gameId", null, new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoNameProvided);
        });
        it("can't join game if you don't provide a gamePopulation", () => {
            const game: Game = new Game(logger, new Messenger());
            const result: Result<Participant[]> = game.joinGame("userId", "gameId", "name", null);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGamePopulationProvided);
        });
        it("can't join game if it doesn't exist", () => {
            const game: Game = new Game(logger, new Messenger());
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
            const game: Game = new Game(logger, new Messenger());
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
            const messenger = new Messenger();
            const messengerStub = sinon.stub(messenger);
            messengerStub.sendGameMessageToAll.returns({ok: true});

            const game: Game = new Game(logger, messengerStub);
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
            expect(messengerStub.sendGameMessageToAll.calledOnce).to.be.true;
        });
        it("can join game if games exist, participant in another game, but game is finished", () => {
            const messenger = new Messenger();
            const messengerStub = sinon.stub(messenger);
            messengerStub.sendGameMessageToAll.returns({ok: true});
            const playerId: string = "test";
            const participant: Participant = {
                userId: playerId,
                name: "not test player",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const game: Game = new Game(logger, messengerStub);
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
            expect(messengerStub.sendGameMessageToAll.calledOnce).to.be.true;
        });
        it("can join game if games exist, but not a participant in another game", () => {
            const messenger = new Messenger();
            const messengerStub = sinon.stub(messenger);
            messengerStub.sendGameMessageToAll.returns({ok: true});
            const otherPlayerId: string = "not test";
            const participant: Participant = {
                userId: otherPlayerId,
                name: "not test player",
                numberOfDice: 5,
                roll: [],
                eliminated: false
            }
            const game: Game = new Game(logger, messengerStub);
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
            expect(messengerStub.sendGameMessageToAll.calledOnce).to.be.true;
        });
        it("can join game if games exist, but player was already eliminated from their game", () => {
            const messenger = new Messenger();
            const messengerStub = sinon.stub(messenger);
            messengerStub.sendGameMessageToAll.returns({ok: true});
            const playerId: string = "not test";
            const participant: Participant = {
                userId: playerId,
                name: "not test player",
                numberOfDice: 5,
                roll: [],
                eliminated: true
            }
            const game: Game = new Game(logger, messengerStub);
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
            expect(messengerStub.sendGameMessageToAll.calledOnce).to.be.true;
        });
    });
    describe("start game functionality", () => {
        it("can't start game if you don't provide a userID", () => {
            const game: Game = new Game(logger, new Messenger());
            const result: Result<string> = game.startGame(null, "gameId", new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoUserIDProvided);
        });
        it("can't start game if you don't provide a gameID", () => {
            const game: Game = new Game(logger, new Messenger());
            const result: Result<string> = game.startGame("userId", null, new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGameIDProvided);
        });
        it("can't start game if you don't provide a gamePopulation", () => {
            const game: Game = new Game(logger, new Messenger());
            const result: Result<string> = game.startGame("userId", "gameId", null);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGamePopulationProvided);
        });
        it("can't start game if it doesn't exist", () => {
            const game: Game = new Game(logger, new Messenger());
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
            const game: Game = new Game(logger, new Messenger());
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
            const game: Game = new Game(logger, new Messenger());
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
            const game: Game = new Game(logger, new Messenger());
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
            const messenger = new Messenger();
            const messengerStub = sinon.stub(messenger);
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
            const game: Game = new Game(logger, messengerStub);
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
            expect(messengerStub.sendGameMessageToAll.calledOnce).to.be.true;
        });
    });
    describe("start Round tests", () => {
        it("can't start round if you don't provide a gameId", () => {
            const game: Game = new Game(logger, new Messenger());
            const result: Result<string> = game.startRound(null, new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGameIDProvided);
        });
        it("can't start round if you don't provide a gamePopulation", () => {
            const game: Game = new Game(logger, new Messenger());
            const result: Result<string> = game.startRound("gameId", null);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGamePopulationProvided);
        });
        it("can't start round if game doesn't exist", () => {
            const game: Game = new Game(logger, new Messenger());
            const result: Result<string> = game.startRound("gameId", new Map<string, GameInterface>());
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.GameNotFound);
        });
    });
    describe("calculateStartingPlayer tests", () => {
        it("can't calculate starting player if no game provided.", () => {
            const game: Game = new Game(logger, new Messenger());
            const result: Result<Participant> = game.calculateStartingPlayer(null);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGameSpecified);
        });
        it("can't calculate starting player if no game messages found.", () => {
            const game: Game = new Game(logger, new Messenger());
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
            const game: Game = new Game(logger, new Messenger());
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
            const game: Game = new Game(logger, new Messenger());
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
            const game: Game = new Game(logger, new Messenger());
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
            const game: Game = new Game(logger, new Messenger());
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
                cheatSuccess: true,
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
            const game = new Game(null, null);

            const result: Result<string> = game.generateDiceAndNotifyGameMessage(null, startingPlayer, messageType, gamePopulation);
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
            const game = new Game(null, null);

            const result: Result<string> = game.generateDiceAndNotifyGameMessage(gameId, null, messageType, gamePopulation);
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
            const game = new Game(null, null);

            const result: Result<string> = game.generateDiceAndNotifyGameMessage(gameId, startingPlayer, null, gamePopulation);
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
            const game = new Game(null, null);

            const result: Result<string> = game.generateDiceAndNotifyGameMessage(gameId, startingPlayer, messageType, null);
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
            const gameInterface: GameInterface = {
                started: false,
                finished: false,
                gameMessageLog: [],
                participants: [startingPlayer]
            }
            gamePopulation.set(gameId, gameInterface);
            const game = new Game(null, new Messenger());

            const result: Result<string> = game.generateDiceAndNotifyGameMessage(gameId, startingPlayer, messageType, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.ParticipantNotInConnectionList);
        });
        it("generateDiceAndNotifyGameMessage succeeds", () => {
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
            const tempMessenger = new Messenger();
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
            tempMessenger.wsConnections = wsConnections;

            const game = new Game(null, tempMessenger);
            const result: Result<string> = game.generateDiceAndNotifyGameMessage(gameId, startingPlayer, messageType, gamePopulation);
            result.ok.should.be.true;

            expect(startingPlayerWebSocketStub.send.calledOnce).to.be.true;
            expect(nextPlayerWebSocketStub.send.calledOnce).to.be.true;
            const startingPlayerMessage = JSON.parse(startingPlayerWebSocketStub.send.firstCall.args[0]);
            const nextPlayerMessage = JSON.parse(nextPlayerWebSocketStub.send.firstCall.args[0]);
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
    describe ("processClaim tests", () => {
        it("processClaim fails if no gameId", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: ""
            };            
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const game = new Game(null, null);

            const result: Result<string> = game.processClaim(null, playerId, currentClaim, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGameIDProvided);
        });
        it("processClaim fails if game not found", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: ""
            };            
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const game = new Game(null, null);

            const result: Result<string> = game.processClaim(gameId, playerId, currentClaim, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.GameNotFound);
        });
        it("processClaim fails if game not started", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: ""
            };            
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const player: Participant = {
                userId: "userId",
                name: "next name",
                numberOfDice: 3,
                roll: [],
                eliminated: false
            }
            const gameInterface: GameInterface = {
                started: false,
                finished: false,
                gameMessageLog: [],
                participants: [player]
            }
            gamePopulation.set(gameId, gameInterface);
            const game = new Game(null, null);

            const result: Result<string> = game.processClaim(gameId, playerId, currentClaim, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.GameNotStarted);
        });
        it("processClaim fails if no playerId", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: ""
            };            
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const player: Participant = {
                userId: "userId",
                name: "next name",
                numberOfDice: 3,
                roll: [],
                eliminated: false
            }
            const gameInterface: GameInterface = {
                started: true,
                finished: false,
                gameMessageLog: [],
                participants: [player]
            }
            gamePopulation.set(gameId, gameInterface);
            const game = new Game(null, null);

            const result: Result<string> = game.processClaim(gameId, null, currentClaim, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoUserIDProvided);
        });
        it("processClaim fails if no currentClaim", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: ""
            };            
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const game = new Game(null, null);

            const result: Result<string> = game.processClaim(gameId, playerId, null, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoClaimProvided);
        });
        it("processClaim fails if no gamePopulation", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: ""
            };            
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const game = new Game(null, null);

            const result: Result<string> = game.processClaim(gameId, playerId, currentClaim, null);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGamePopulationProvided);
        });
        it("processClaim fails if it's not your turn and responding to claim", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: ""
            };            
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const player: Participant = {
                userId: playerId,
                name: "next name",
                numberOfDice: 3,
                roll: [],
                eliminated: false
            }
            const gameInterface: GameInterface = {
                started: true,
                finished: false,
                gameMessageLog: [],
                participants: [player]
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.Claim,
                message: {nextPlayerId: "notPlayerId"}
            }
            gameInterface.gameMessageLog.push(lastMessage);
            gamePopulation.set(gameId, gameInterface);
            const game = new Game(null, null);

            const result: Result<string> = game.processClaim(gameId, playerId, currentClaim, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NotYourTurn);
        });
        it("processClaim fails if less quantity than previous claim", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: {
                    quantity: 2
                }
            };            
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const player: Participant = {
                userId: playerId,
                name: "next name",
                numberOfDice: 3,
                roll: [],
                eliminated: false
            }
            const gameInterface: GameInterface = {
                started: true,
                finished: false,
                gameMessageLog: [],
                participants: [player]
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.Claim,
                message: {
                    nextPlayerId: playerId,
                    quantity: 3
                }
            }
            gameInterface.gameMessageLog.push(lastMessage);
            gamePopulation.set(gameId, gameInterface);
            const game = new Game(null, null);

            const result: Result<string> = game.processClaim(gameId, playerId, currentClaim, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.ClaimTooLow);
        });
        it("processClaim fails if it's not your turn and responding to starting event", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: {
                    quantity: 2
                }
            };            
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const player: Participant = {
                userId: playerId,
                name: "next name",
                numberOfDice: 3,
                roll: [],
                eliminated: false
            }
            const gameInterface: GameInterface = {
                started: true,
                finished: false,
                gameMessageLog: [],
                participants: [player]
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.RoundStarted,
                message: {
                    participant:{
                        userId: "notPlayerId"
                    },
                    startingPlayer: "notPlayerId"
                }
            }
            gameInterface.gameMessageLog.push(lastMessage);
            gamePopulation.set(gameId, gameInterface);
            const game = new Game(null, null);

            const result: Result<string> = game.processClaim(gameId, playerId, currentClaim, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NotYourTurn);
        });        
        it("processClaim fails if resolve cheat fails", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: {
                    cheat: true
                }
            };            
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const player: Participant = {
                userId: playerId,
                name: "next name",
                numberOfDice: 3,
                roll: [],
                eliminated: false
            }
            const gameInterface: GameInterface = {
                started: true,
                finished: false,
                gameMessageLog: [],
                participants: [player]
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.RoundStarted,
                message: {
                    participant:{
                        userId: playerId
                    },
                    startingPlayer: playerId
                }
            }
            gameInterface.gameMessageLog.push(lastMessage);
            gamePopulation.set(gameId, gameInterface);
            const game = new Game(null, null);
            const errorMessage: string = "ruh roh!";
            const errorResult: Result<string> = {
                ok: false,
                message: errorMessage
            }
            sinon.stub(game, "resolveCheat").returns(errorResult);

            const result: Result<string> = game.processClaim(gameId, playerId, currentClaim, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(errorMessage);
        });
        it("processClaim succeeds if resolve cheat succeeds", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: {
                    cheat: true
                }
            };            
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const player: Participant = {
                userId: playerId,
                name: "next name",
                numberOfDice: 3,
                roll: [],
                eliminated: false
            }
            const gameInterface: GameInterface = {
                started: true,
                finished: false,
                gameMessageLog: [],
                participants: [player]
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.RoundStarted,
                message: {
                    participant:{
                        userId: playerId
                    },
                    startingPlayer: playerId
                }
            }
            gameInterface.gameMessageLog.push(lastMessage);
            gamePopulation.set(gameId, gameInterface);
            const game = new Game(null, null);
            const successMessage: string = "oh yeah!";
            const successResult: Result<string> = {
                ok: true,
                message: successMessage
            }
            sinon.stub(game, "resolveCheat").returns(successResult);

            const result: Result<string> = game.processClaim(gameId, playerId, currentClaim, gamePopulation);
            result.ok.should.be.true;
            result.message.should.equal("claim processed.");
        });        
        it("processClaim fails if resolve claim fails", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: {
                    cheat: false
                }
            };            
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const player: Participant = {
                userId: playerId,
                name: "next name",
                numberOfDice: 3,
                roll: [],
                eliminated: false
            }
            const gameInterface: GameInterface = {
                started: true,
                finished: false,
                gameMessageLog: [],
                participants: [player]
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.RoundStarted,
                message: {
                    participant:{
                        userId: playerId
                    },
                    startingPlayer: playerId
                }
            }
            gameInterface.gameMessageLog.push(lastMessage);
            gamePopulation.set(gameId, gameInterface);
            const game = new Game(null, null);
            const errorMessage: string = "ruh roh!";
            const errorResult: Result<string> = {
                ok: false,
                message: errorMessage
            }
            sinon.stub(game, "resolveClaim").returns(errorResult);

            const result: Result<string> = game.processClaim(gameId, playerId, currentClaim, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(errorMessage);
        });
        it("processClaim succeeds if resolve claim succeeds", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: {
                    cheat: false
                }
            };            
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const player: Participant = {
                userId: playerId,
                name: "next name",
                numberOfDice: 3,
                roll: [],
                eliminated: false
            }
            const gameInterface: GameInterface = {
                started: true,
                finished: false,
                gameMessageLog: [],
                participants: [player]
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.RoundStarted,
                message: {
                    participant:{
                        userId: playerId
                    },
                    startingPlayer: playerId
                }
            }
            gameInterface.gameMessageLog.push(lastMessage);
            gamePopulation.set(gameId, gameInterface);
            const game = new Game(null, null);
            const successMessage: string = "oh yeah!";
            const successResult: Result<string> = {
                ok: true,
                message: successMessage
            }
            sinon.stub(game, "resolveClaim").returns(successResult);

            const result: Result<string> = game.processClaim(gameId, playerId, currentClaim, gamePopulation);
            result.ok.should.be.true;
            result.message.should.equal("claim processed.");
        });
    });
    describe ("resolveClaim tests", () => {
        it("resolveClaim fails if no gameId", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: ""
            };
            const existingGame : GameInterface = {
                participants: [],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const game = new Game(null, null);

            const result: Result<string> = game.resolveClaim(null, playerId, currentClaim, existingGame, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGameIDProvided);
        });
        it("resolveClaim fails if no playerId", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: ""
            };
            const existingGame : GameInterface = {
                participants: [],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const game = new Game(null, null);

            const result: Result<string> = game.resolveClaim(gameId, null, currentClaim, existingGame, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoUserIDProvided);
        });
        it("resolveClaim fails if no currentClaim", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: ""
            };
            const existingGame : GameInterface = {
                participants: [],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const game = new Game(null, null);

            const result: Result<string> = game.resolveClaim(gameId, playerId, null, existingGame, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoClaimProvided);
        });
        it("resolveClaim fails if no existingGame", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: ""
            };
            const existingGame : GameInterface = {
                participants: [],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const game = new Game(null, null);

            const result: Result<string> = game.resolveClaim(gameId, playerId, currentClaim, null, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.GameNotFound);
        });
        it("resolveClaim fails if no gamePopulation", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const currentClaim: GameMessage = {
                messageType: MessageType.Claim,
                message: ""
            };
            const existingGame : GameInterface = {
                participants: [],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const game = new Game(null, null);

            const result: Result<string> = game.resolveClaim(gameId, playerId, currentClaim, existingGame, null);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGamePopulationProvided);
        });
        it("resolveClaim succeeds and proceeds to next player", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const nextPlayerId: string = "nextPlayerId";
            const player: Participant = {
                userId: playerId,
                name: "current name",
                numberOfDice: 3,
                roll: [],
                eliminated: false
            }
            const nextPlayer: Participant = {
                userId: nextPlayerId,
                name: "next name",
                numberOfDice: 3,
                roll: [],
                eliminated: false
            }
            const currentClaim: Claim = {
                quantity: 1,
                value: 1,
                cheat: false
            }
            const expectedClaim: Claim = {
                quantity: 1,
                value: 1,
                cheat: false,
                nextPlayerId: nextPlayerId,
                playerId: playerId
            }
            const currentClaimMessage: GameMessage = {
                messageType: MessageType.Claim,
                message: currentClaim
            };
            const existingGame : GameInterface = {
                participants: [player, nextPlayer],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const messenger = new Messenger();
            const messengerStub = sinon.stub(messenger);
            messengerStub.sendGameMessageToAll.returns({ok: true});
            const game = new Game(null, messenger);

            const result: Result<string> = game.resolveClaim(gameId, playerId, currentClaimMessage, existingGame, gamePopulation);
            result.ok.should.be.true;
            expect(messengerStub.sendGameMessageToAll.calledOnce).to.be.true;
            const actualClaim: Claim = messengerStub.sendGameMessageToAll.getCall(0).args[2];
            assert.equal(JSON.stringify(actualClaim), JSON.stringify(expectedClaim));
        });
        it("resolveClaim succeeds and proceeds to next player even with an eliminated player in the middle", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const nextPlayerId: string = "nextPlayerId";
            const eliminatedPlayerId: string = "nextPlayerId";
            const player: Participant = {
                userId: playerId,
                name: "current name",
                numberOfDice: 3,
                roll: [],
                eliminated: false
            }
            const eliminatedPlayer: Participant = {
                userId: nextPlayerId,
                name: "eliminated name",
                numberOfDice: 3,
                roll: [],
                eliminated: true
            }
            const nextPlayer: Participant = {
                userId: nextPlayerId,
                name: "next name",
                numberOfDice: 3,
                roll: [],
                eliminated: false
            }
            const currentClaim: Claim = {
                quantity: 1,
                value: 1,
                cheat: false
            }
            const expectedClaim: Claim = {
                quantity: 1,
                value: 1,
                cheat: false,
                nextPlayerId: nextPlayerId,
                playerId: playerId
            }
            const currentClaimMessage: GameMessage = {
                messageType: MessageType.Claim,
                message: currentClaim
            };
            const existingGame : GameInterface = {
                participants: [nextPlayer, eliminatedPlayer, player],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const messenger = new Messenger();
            const messengerStub = sinon.stub(messenger);
            messengerStub.sendGameMessageToAll.returns({ok: true});
            const game = new Game(null, messenger);

            const result: Result<string> = game.resolveClaim(gameId, playerId, currentClaimMessage, existingGame, gamePopulation);
            result.ok.should.be.true;
            expect(messengerStub.sendGameMessageToAll.calledOnce).to.be.true;
            const actualClaim: Claim = messengerStub.sendGameMessageToAll.getCall(0).args[2];
            assert.equal(JSON.stringify(actualClaim), JSON.stringify(expectedClaim));
        });
    });
    describe ("resolveCheat tests", () => {
        it("resolveCheat fails if no gameId", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const nextPlayerId: string = "nextPlayerId";
            const player: Participant = {
                userId: playerId,
                name: "current name",
                numberOfDice: 3,
                roll: [1,1,1,1,1],
                eliminated: false
            }
            const nextPlayer: Participant = {
                userId: nextPlayerId,
                name: "next name",
                numberOfDice: 3,
                roll: [2,2,2,2,2],
                eliminated: false
            }
            const lastClaim: Claim = {
                quantity: 2,
                value: 2,
                cheat: false,
                playerId: playerId,
                nextPlayerId: nextPlayerId
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.Claim,
                message: lastClaim
            };
            const existingGame : GameInterface = {
                participants: [player, nextPlayer],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const game = new Game(null, null);

            const result: Result<string> = game.resolveCheat(null, playerId, lastMessage, existingGame, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGameIDProvided);
        });
        it("resolveCheat fails if no playerId", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const nextPlayerId: string = "nextPlayerId";
            const player: Participant = {
                userId: playerId,
                name: "current name",
                numberOfDice: 3,
                roll: [1,1,1,1,1],
                eliminated: false
            }
            const nextPlayer: Participant = {
                userId: nextPlayerId,
                name: "next name",
                numberOfDice: 3,
                roll: [2,2,2,2,2],
                eliminated: false
            }
            const lastClaim: Claim = {
                quantity: 2,
                value: 2,
                cheat: false,
                playerId: playerId,
                nextPlayerId: nextPlayerId
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.Claim,
                message: lastClaim
            };
            const existingGame : GameInterface = {
                participants: [player, nextPlayer],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const game = new Game(null, null);

            const result: Result<string> = game.resolveCheat(gameId, null, lastMessage, existingGame, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoUserIDProvided);
        });
        it("resolveCheat fails if no lastMessage", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const nextPlayerId: string = "nextPlayerId";
            const player: Participant = {
                userId: playerId,
                name: "current name",
                numberOfDice: 3,
                roll: [1,1,1,1,1],
                eliminated: false
            }
            const nextPlayer: Participant = {
                userId: nextPlayerId,
                name: "next name",
                numberOfDice: 3,
                roll: [2,2,2,2,2],
                eliminated: false
            }
            const lastClaim: Claim = {
                quantity: 2,
                value: 2,
                cheat: false,
                playerId: playerId,
                nextPlayerId: nextPlayerId
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.Claim,
                message: lastClaim
            };
            const existingGame : GameInterface = {
                participants: [player, nextPlayer],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const game = new Game(null, null);

            const result: Result<string> = game.resolveCheat(gameId, playerId, null, existingGame, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoClaimProvided);
        });
        it("resolveCheat fails if no existingGame", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const nextPlayerId: string = "nextPlayerId";
            const player: Participant = {
                userId: playerId,
                name: "current name",
                numberOfDice: 3,
                roll: [1,1,1,1,1],
                eliminated: false
            }
            const nextPlayer: Participant = {
                userId: nextPlayerId,
                name: "next name",
                numberOfDice: 3,
                roll: [2,2,2,2,2],
                eliminated: false
            }
            const lastClaim: Claim = {
                quantity: 2,
                value: 2,
                cheat: false,
                playerId: playerId,
                nextPlayerId: nextPlayerId
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.Claim,
                message: lastClaim
            };
            const existingGame : GameInterface = {
                participants: [player, nextPlayer],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const game = new Game(null, null);

            const result: Result<string> = game.resolveCheat(gameId, playerId, lastMessage, null, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.GameNotFound);
        });
        it("resolveCheat fails if no gamePopulation", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const nextPlayerId: string = "nextPlayerId";
            const player: Participant = {
                userId: playerId,
                name: "current name",
                numberOfDice: 3,
                roll: [1,1,1,1,1],
                eliminated: false
            }
            const nextPlayer: Participant = {
                userId: nextPlayerId,
                name: "next name",
                numberOfDice: 3,
                roll: [2,2,2,2,2],
                eliminated: false
            }
            const lastClaim: Claim = {
                quantity: 2,
                value: 2,
                cheat: false,
                playerId: playerId,
                nextPlayerId: nextPlayerId
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.Claim,
                message: lastClaim
            };
            const existingGame : GameInterface = {
                participants: [player, nextPlayer],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const game = new Game(null, null);

            const result: Result<string> = game.resolveCheat(gameId, playerId, lastMessage, existingGame, null);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.NoGamePopulationProvided);
        });
        it("resolveCheat fails if last message isn't a claim", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const nextPlayerId: string = "nextPlayerId";
            const player: Participant = {
                userId: playerId,
                name: "current name",
                numberOfDice: 3,
                roll: [1,1,1,1,1],
                eliminated: false
            }
            const nextPlayer: Participant = {
                userId: nextPlayerId,
                name: "next name",
                numberOfDice: 3,
                roll: [2,2,2,2,2],
                eliminated: false
            }
            const lastClaim: Claim = {
                quantity: 2,
                value: 2,
                cheat: false,
                playerId: playerId,
                nextPlayerId: nextPlayerId
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.RoundStarted,
                message: lastClaim
            };
            const existingGame : GameInterface = {
                participants: [player, nextPlayer],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const game = new Game(null, null);

            const result: Result<string> = game.resolveCheat(gameId, playerId, lastMessage, existingGame, gamePopulation);
            result.ok.should.be.false;
            result.message.should.equal(ErrorMessage.CanOnlyCheatClaim);
        });
        it("resolveCheat succeeds if player was cheating", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const nextPlayerId: string = "nextPlayerId";
            const player: Participant = {
                userId: playerId,
                name: "current name",
                numberOfDice: 5,
                roll: [1,2,3,4,5],
                eliminated: false
            }
            const nextPlayer: Participant = {
                userId: nextPlayerId,
                name: "next name",
                numberOfDice: 5,
                roll: [2,2,2,2,2],
                eliminated: false
            }
            const lastClaim: Claim = {
                quantity: 2,
                value: 2,
                cheat: false,
                playerId: playerId,
                nextPlayerId: nextPlayerId
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.Claim,
                message: lastClaim
            };
            const existingGame : GameInterface = {
                participants: [player, nextPlayer],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const expectedRoundResults: RoundResults = {
                callingPlayer: nextPlayer,
                calledPlayer: player,
                claim: lastClaim,
                cheatSuccess: true,
                playerEliminated: false
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const messenger = new Messenger();
            const messengerStub = sinon.stub(messenger);
            messengerStub.sendGameMessageToAll.returns({ok: true});
            const game = new Game(null, messengerStub);
            const startRoundSuccess = {ok: true};
            const startRoundStub = sinon.stub(game, "startRound").returns(startRoundSuccess);

            const result: Result<string> = game.resolveCheat(gameId, nextPlayerId, lastMessage, existingGame, gamePopulation);
            result.ok.should.be.true;
            expect(messengerStub.sendGameMessageToAll.calledOnce).to.be.true;
            const actualRoundResult: RoundResults = messengerStub.sendGameMessageToAll.getCall(0).args[2];
            assert.equal(JSON.stringify(actualRoundResult), JSON.stringify(expectedRoundResults));
            assert.equal(player.numberOfDice, 4);
            assert.equal(nextPlayer.numberOfDice, 5);
            expect(startRoundStub.calledOnce).to.be.true;
        });
        it("resolveCheat fails if player wasn't cheating", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const nextPlayerId: string = "nextPlayerId";
            const player: Participant = {
                userId: playerId,
                name: "current name",
                numberOfDice: 5,
                roll: [2,2,3,4,5],
                eliminated: false
            }
            const nextPlayer: Participant = {
                userId: nextPlayerId,
                name: "next name",
                numberOfDice: 5,
                roll: [2,2,2,2,2],
                eliminated: false
            }
            const lastClaim: Claim = {
                quantity: 2,
                value: 2,
                cheat: false,
                playerId: playerId,
                nextPlayerId: nextPlayerId
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.Claim,
                message: lastClaim
            };
            const existingGame : GameInterface = {
                participants: [player, nextPlayer],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const expectedRoundResults: RoundResults = {
                callingPlayer: nextPlayer,
                calledPlayer: player,
                claim: lastClaim,
                cheatSuccess: false,
                playerEliminated: false
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const messenger = new Messenger();
            const messengerStub = sinon.stub(messenger);
            messengerStub.sendGameMessageToAll.returns({ok: true});
            const game = new Game(null, messengerStub);
            const startRoundSuccess = {ok: true};
            const startRoundStub = sinon.stub(game, "startRound").returns(startRoundSuccess);

            const result: Result<string> = game.resolveCheat(gameId, nextPlayerId, lastMessage, existingGame, gamePopulation);
            result.ok.should.be.true;
            expect(messengerStub.sendGameMessageToAll.calledOnce).to.be.true;
            const actualRoundResult: RoundResults = messengerStub.sendGameMessageToAll.getCall(0).args[2];
            assert.equal(JSON.stringify(actualRoundResult), JSON.stringify(expectedRoundResults));
            assert.equal(player.numberOfDice, 5);
            assert.equal(nextPlayer.numberOfDice, 4);
            expect(startRoundStub.calledOnce).to.be.true;
        });
        it("resolveCheat fails if startRound fails", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const nextPlayerId: string = "nextPlayerId";
            const player: Participant = {
                userId: playerId,
                name: "current name",
                numberOfDice: 5,
                roll: [2,2,3,4,5],
                eliminated: false
            }
            const nextPlayer: Participant = {
                userId: nextPlayerId,
                name: "next name",
                numberOfDice: 5,
                roll: [2,2,2,2,2],
                eliminated: false
            }
            const lastClaim: Claim = {
                quantity: 2,
                value: 2,
                cheat: false,
                playerId: playerId,
                nextPlayerId: nextPlayerId
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.Claim,
                message: lastClaim
            };
            const existingGame : GameInterface = {
                participants: [player, nextPlayer],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const expectedRoundResults: RoundResults = {
                callingPlayer: nextPlayer,
                calledPlayer: player,
                claim: lastClaim,
                cheatSuccess: false,
                playerEliminated: false
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const messenger = new Messenger();
            const messengerStub = sinon.stub(messenger);
            messengerStub.sendGameMessageToAll.returns({ok: true});
            const game = new Game(null, messengerStub);
            const startRoundSuccess = {ok: false};
            const startRoundStub = sinon.stub(game, "startRound").returns(startRoundSuccess);

            const result: Result<string> = game.resolveCheat(gameId, nextPlayerId, lastMessage, existingGame, gamePopulation);
            result.ok.should.be.false;
            expect(messengerStub.sendGameMessageToAll.calledOnce).to.be.true;
            const actualRoundResult: RoundResults = messengerStub.sendGameMessageToAll.getCall(0).args[2];
            assert.equal(JSON.stringify(actualRoundResult), JSON.stringify(expectedRoundResults));
            assert.equal(player.numberOfDice, 5);
            assert.equal(nextPlayer.numberOfDice, 4);
            expect(startRoundStub.calledOnce).to.be.true;
        });
        it("resolveCheat will eliminate the cheater", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const nextPlayerId: string = "nextPlayerId";
            const player: Participant = {
                userId: playerId,
                name: "current name",
                numberOfDice: 1,
                roll: [1],
                eliminated: false
            }
            const nextPlayer: Participant = {
                userId: nextPlayerId,
                name: "next name",
                numberOfDice: 5,
                roll: [2,2,2,2,2],
                eliminated: false
            }
            const lastClaim: Claim = {
                quantity: 2,
                value: 2,
                cheat: false,
                playerId: playerId,
                nextPlayerId: nextPlayerId
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.Claim,
                message: lastClaim
            };
            const existingGame : GameInterface = {
                participants: [player, nextPlayer],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const expectedRoundResults: RoundResults = {
                callingPlayer: nextPlayer,
                calledPlayer: player,
                claim: lastClaim,
                cheatSuccess: true,
                playerEliminated: true
            }
            const expectedGameOverResults: GameOver = {
                winner: nextPlayer
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const messenger = new Messenger();
            const messengerStub = sinon.stub(messenger);
            messengerStub.sendGameMessageToAll.returns({ok: true});
            const game = new Game(null, messengerStub);
            const startRoundSuccess = {ok: true};
            const startRoundStub = sinon.stub(game, "startRound").returns(startRoundSuccess);

            const result: Result<string> = game.resolveCheat(gameId, nextPlayerId, lastMessage, existingGame, gamePopulation);
            result.ok.should.be.true;
            expect(messengerStub.sendGameMessageToAll.calledTwice).to.be.true;
            const actualRoundResult: RoundResults = messengerStub.sendGameMessageToAll.getCall(0).args[2];
            assert.equal(JSON.stringify(actualRoundResult), JSON.stringify(expectedRoundResults));
            assert.equal(player.numberOfDice, 0);
            assert.equal(nextPlayer.numberOfDice, 5);
            const actualGameOverResult: RoundResults = messengerStub.sendGameMessageToAll.getCall(1).args[2];
            assert.equal(JSON.stringify(actualGameOverResult), JSON.stringify(expectedGameOverResults));
            expect(startRoundStub.notCalled).to.be.true;
            expect(existingGame.finished).to.be.true;
        });
        it("resolveCheat will eliminate the cheat caller", () => {
            const gameId: string = "gameId";
            const playerId: string = "playerId";
            const nextPlayerId: string = "nextPlayerId";
            const player: Participant = {
                userId: playerId,
                name: "current name",
                numberOfDice: 5,
                roll: [1,1,1,1,1],
                eliminated: false
            }
            const nextPlayer: Participant = {
                userId: nextPlayerId,
                name: "next name",
                numberOfDice: 1,
                roll: [5],
                eliminated: false
            }
            const lastClaim: Claim = {
                quantity: 2,
                value: 1,
                cheat: false,
                playerId: playerId,
                nextPlayerId: nextPlayerId
            }
            const lastMessage: GameMessage = {
                messageType: MessageType.Claim,
                message: lastClaim
            };
            const existingGame : GameInterface = {
                participants: [player, nextPlayer],
                started: true,
                finished: false,
                gameMessageLog: []
            }
            const expectedRoundResults: RoundResults = {
                callingPlayer: nextPlayer,
                calledPlayer: player,
                claim: lastClaim,
                cheatSuccess: false,
                playerEliminated: true
            }
            const expectedGameOverResults: GameOver = {
                winner: player
            }
            const gamePopulation: Map<string, GameInterface> = new Map<string, GameInterface>();
            const messenger = new Messenger();
            const messengerStub = sinon.stub(messenger);
            messengerStub.sendGameMessageToAll.returns({ok: true});
            const game = new Game(null, messengerStub);
            const startRoundSuccess = {ok: true};
            const startRoundStub = sinon.stub(game, "startRound").returns(startRoundSuccess);

            const result: Result<string> = game.resolveCheat(gameId, nextPlayerId, lastMessage, existingGame, gamePopulation);
            result.ok.should.be.true;
            expect(messengerStub.sendGameMessageToAll.calledTwice).to.be.true;
            const actualRoundResult: RoundResults = messengerStub.sendGameMessageToAll.getCall(0).args[2];
            assert.equal(JSON.stringify(actualRoundResult), JSON.stringify(expectedRoundResults));
            assert.equal(player.numberOfDice, 5);
            assert.equal(nextPlayer.numberOfDice, 0);
            const actualGameOverResult: RoundResults = messengerStub.sendGameMessageToAll.getCall(1).args[2];
            assert.equal(JSON.stringify(actualGameOverResult), JSON.stringify(expectedGameOverResults));
            expect(startRoundStub.notCalled).to.be.true;
            expect(existingGame.finished).to.be.true;
        });
    });
});
