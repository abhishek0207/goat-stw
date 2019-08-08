module.exports = class ListNode {
  constructor(c) {
    this.client = c;
    this.next = {};
    this.setClient = client => {
      this.client = client;
    };
    this.setNext = nextClient => {
      this.next = nextClient;
    };
  }
};
