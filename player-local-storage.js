export default class PlayerLocalStorage {
  constructor(localMessaging, eventsHandler) {
    this.localMessaging = localMessaging;
    this.eventsHandler = eventsHandler;
    this.requiredModulesTries = 0;
    this.authorized = null;

    this._bindReceiveMessagesHandler();

    if (!this.isConnected()) {
      this._sendEvent({
        "event": "no-connection"
      });
    } else {
      // immediately try and find out presence of required modules (local-storage, licensing)
      this._sendClientListRequest();
    }
  }

  _bindReceiveMessagesHandler() {
    this.localMessaging.receiveMessages((message) => { this._handleMessage(message) });
  }

  _sendClientListRequest() {
    this.localMessaging.broadcastMessage({topic: "client-list-request"});
  }

  _sendLicensingRequest() {
    this.localMessaging.broadcastMessage({topic: "storage-licensing-request"});
  }

  _handleMessage(message) {
    if (!message || !message.topic) {return;}

    switch (message.topic.toUpperCase()) {
      case "CLIENT-LIST":
        return this._handleClientListUpdate(message);
      case "STORAGE-LICENSING-UPDATE":
        return this._handleLicensingUpdate(message);
    }
  }

  _handleClientListUpdate(message) {
    const clients = message.clients;
    const required = ["local-storage", "licensing"];

    let running = required.every((val) => clients.includes(val));

    if (running) {
      this._sendLicensingRequest();
      return;
    }

    if (this.requiredModulesTries < 3) {
      this.requiredModulesTries += 1;
      // request client list again after 1 second delay
      setTimeout(()=>{this._sendClientListRequest();}, 1000);
    } else {
      // attempted 3 times, notify widget/component
      this._sendEvent({
        "event": "no-required-modules"
      });
    }
  }

  _handleLicensingUpdate(message) {
    if (message && message.userFriendlyStatus) {
      const previousAuthorized = this.authorized;
      const currentAuthorized = message.isAuthorized;

      // detect licensing change
      if (previousAuthorized !== currentAuthorized) {
        this.authorized = message.isAuthorized;

        this._sendEvent({
          "event": message.userFriendlyStatus
        });
      }
    } else {
      console.log(`Error: Invalid STORAGE-LICENSING-UPDATE message - ${message}`);
    }
  }

  _sendEvent(event) {
    if (!this.eventsHandler || typeof this.eventsHandler !== "function" || !event) {return;}
    this.eventsHandler(event);
  }

  /*
  PUBLIC API
   */

  isAuthorized() {
    return this.authorized;
  }

  isConnected() {
    return this.localMessaging.canConnect();
  }
}
