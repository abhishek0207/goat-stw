module.exports = class Pet {
  constructor() {
    this.state = {
      location: "KENNEL",
      clientId: "",
      petState: "AVAILABLE",
      socket: {},
      skin: 0
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
    this.changePetSkin = skin => {
      this.state.skin = skin;
    };
  }
};
