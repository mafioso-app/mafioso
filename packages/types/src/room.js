"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Team = exports.GamePhase = exports.RoomStatus = void 0;
var RoomStatus;
(function (RoomStatus) {
    RoomStatus["LOBBY"] = "LOBBY";
    RoomStatus["ACTIVE"] = "ACTIVE";
    RoomStatus["FINISHED"] = "FINISHED";
})(RoomStatus || (exports.RoomStatus = RoomStatus = {}));
var GamePhase;
(function (GamePhase) {
    GamePhase["LOBBY"] = "LOBBY";
    GamePhase["NIGHT"] = "NIGHT";
    GamePhase["DAY_DISCUSSION"] = "DAY_DISCUSSION";
    GamePhase["DAY_VOTING"] = "DAY_VOTING";
    GamePhase["GAME_OVER"] = "GAME_OVER";
})(GamePhase || (exports.GamePhase = GamePhase = {}));
var Team;
(function (Team) {
    Team["VILLAGE"] = "VILLAGE";
    Team["MAFIA"] = "MAFIA";
})(Team || (exports.Team = Team = {}));
//# sourceMappingURL=room.js.map