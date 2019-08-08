module.exports = class Pet {
  constructor() {
    this.state = {
      location: "KENNEL",
      clientId: "",
      petState: "AVAILABLE",
      socket: {}
    };
    this.setPetState = newState => {
      this.state.petState = newState;
    };
    this.setClientID = socket => {
      this.state.clientId = socket;
    };
    this.setPetLocation = location => {
      this.state.location = location;
    };
  }
};
