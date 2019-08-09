var express = require("express"); //Importing Express
var _ = require("lodash");
var Pet = require("./pet");
var ListNode = require("./ListNode");
var sequencer = require("./sequencer");
var app = express(); //Getting App From Express
var fs = require("fs"); //Importing File System Module To Access Files
const port = 8080; //Creating A Constant For Providing The Port
//Routing Request : http://localhost:port/

var states = require("./petStates");

let clients = [];
let actions = [];
let kennelSocket = {};
const pet = new Pet();
//Routing To Public Folder For Any Static Context
app.use(express.static(__dirname + "/public"));
console.log("Server Running At:localhost:" + port);
var io = require("socket.io").listen(app.listen(port)); //Telling Express+Socket.io App To Listen To Port

const performAnimation = actionQueue => {
  const firstElement = actionQueue.shift();
  if (firstElement) {
    const foundSocket = firstElement.socket;
    foundSocket.emit("PET_COMMAND", firstElement.action);
    pet.setPetState(states.BUSY);
    pet.setClientID(foundSocket.id);
  }
};

const sequenceSort = (a, b) => {
  return a.id - b.id;
};
io.on("connection", async function(socket) {
  console.log(clients.length);
  socket.emit("HELLO", { skin: pet.state.skin });
  socket.on("HELLO_ACK", data => {
    const address = socket.request.connection.remoteAddress;
    const port = socket.request.connection.remotePort;
    let iter = 0;
    clients.push({
      socket,
      ip: address + ":" + port,
      sequenceID: parseInt(data)
    });
  });

  socket.on("CHANGE_SKIN", skinColor => {
    pet.changePetSkin(skinColor);
    socket.broadcast.emit("UPDATE_SKIN", pet.state.skin);
  });
  const getLeftAnimations = (clients, current, petLocation, socketToWork) => {
    const act = [];
    clients.forEach(async client => {
      console.log(client.socket.connected);
      if (client.socket.id !== socketToWork.id) {
        if (
          client.sequenceID > current.sequenceID &&
          client.sequenceID <= petLocation.sequenceID &&
          client.socket.connected
        ) {
          if (client.socket.id === petLocation.socket.id) {
            act.push({
              id: client.sequenceID,
              socket: client.socket,
              action: "STAY_EXIT_LEFT",
              stay: false
            });
          } else
            act.push({
              id: client.sequenceID,
              socket: client.socket,
              action: "PASS_RIGHT_LEFT",
              stay: false
            });
        }
      } else {
        act.push({
          id: client.sequenceID,
          socket: socketToWork,
          action: "ENTER_RIGHT_STAY",
          stay: true
        });
      }
    });

    act.sort((a, b) => b.id - a.id);
    console.log(act);
    return act;
  };

  const getRightAnimations = (clients, current, petLocation, socketToWork) => {
    const act = [];

    clients.forEach(client => {
      console.log(client.socket.connected);
      if (client.socket.id !== socketToWork.id) {
        if (
          client.sequenceID < current.sequenceID &&
          client.sequenceID >= petLocation.sequenceID &&
          client.socket.connected
        ) {
          if (client.socket.id === petLocation.socket.id) {
            act.push({
              id: client.sequenceID,
              socket: client.socket,
              action: "STAY_EXIT_RIGHT",
              stay: false
            });
          } else
            act.push({
              id: client.sequenceID,
              socket: client.socket,
              action: "PASS_LEFT_RIGHT",
              stay: false
            });
        }
      } else {
        act.push({
          id: client.sequenceID,
          socket: socketToWork,
          action: "ENTER_LEFT_STAY",
          stay: true
        });
      }
    });
    console.log(act);
    act.sort((a, b) => a.id - b.id);
    return act;
  };

  socket.on("KENNEL", hasPet => {
    if (_.isEmpty(kennelSocket)) {
      kennelSocket = socket;
      pet.setClientID(socket.id);
      pet.setPetLocation("KENNEL");
      console.log(kennelSocket);
      console.log("kennel is running now");
    } else {
      if (hasPet) {
        if (pet.state.clientId !== kennelSocket.id) {
          socket.emit("TAKE_FROM_KENNEL");
          console.log("entered in pet 1");
        }
      }
      if (!hasPet) {
        if (pet.state.clientId === kennelSocket.id) {
          pet.setClientID(socket.id);
          pet.setPetLocation("KENNEL");
          socket.emit("GIVE_TO_KENNEL");
          console.log("entered in pet 2");
        }
      }
    }
  });

  socket.on("ANIMATION_COMPLETE", () => {
    if (actions.length > 0) {
      performAnimation(actions);
    }
    pet.setPetState(states.BUSY);
    pet.setClientID(socket.id);
  });

  socket.on("ANIMATION_ERROR", data => {
    console.log(data);
    if (actions.length > 0) {
      performAnimation(actions);
    }
    pet.setPetState(states.BUSY);
    pet.setClientID(socket.id);
  });

  socket.on("REQUEST_PET", async function(sentSequence) {
    let socketToWork = {};
    if (sentSequence) {
      socketToWork = clients.find(client => client.sequenceID === sentSequence)
        .socket;
    } else socketToWork = socket;
    //clients = clients.filter((cl) => cl.socket.connected)
    console.log(clients.length);
    console.log("browser socket : ");
    console.log(socketToWork.id);
    console.log("pi socket");
    console.log(socket.id);
    const petLocation = clients.find(cl => cl.socket.id === pet.state.clientId);
    const currentClient = clients.find(cl => cl.socket.id === socketToWork.id);
    console.log(clients.length);
    if (pet.state.petState === states.BUSY) {
      if (_.isEqual(pet.state.clientId, socketToWork.id)) {
        socketToWork.emit("PET_COMMAND", "TRICK");
        pet.setPetState(states.BUSY);
      } else {
        if (currentClient.sequenceID < petLocation.sequenceID) {
          console.log("entered left");
          actions = getLeftAnimations(
            clients,
            currentClient,
            petLocation,
            socketToWork
          );
        } else {
          console.log("Entered right");
          actions = getRightAnimations(
            clients,
            currentClient,
            petLocation,
            socketToWork
          );
        }
        performAnimation(actions);
      }
    } else {
      //this was the first client that requested for the dog from kennel
      kennelSocket.emit("TAKE_FROM_KENNEL");
      socketToWork.emit("PET_COMMAND", "ENTER_LEFT_STAY");
      pet.setClientID(socket.id);
      pet.setPetState(states.BUSY);
    }
    socket.on("disconnect", reason => {
      console.log("disconnected");
      console.log(reason);
      clients = clients.filter(client => client.socket.id !== socket.id);
      if (_.isEqual(pet.state.clientId, socket.id)) {
        kennelSocket.emit("GIVE_TO_KENNEL");
        pet.setClientID(kennelSocket.id);
        pet.setPetState(states.AVAILABLE);
        pet.setPetLocation("KENNEL");
      }
    });
  });
});
