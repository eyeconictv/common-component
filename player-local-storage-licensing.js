export default class PlayerLocalStorageLicensing {
  constructor(localMessaging, eventsHandler, companyId = "") {
    this.localMessaging = localMessaging;
    this.eventsHandler = eventsHandler;
    this.companyId = companyId;
    this.authorized = null;
  }

  _bindReceiveMessagesHandler() {
    this.localMessaging.receiveMessages((message) => { this._handleMessage(message) });
  }

  _sendLicensingRequest() {
    this.localMessaging.broadcastMessage({topic: "storage-licensing-request"});
  }

  _handleMessage(message) {
    if (!message || !message.topic) {return;}

    switch (message.topic.toUpperCase()) {
      case "STORAGE-LICENSING-UPDATE":
        return this._handleLicensingUpdate(message);
    }
  }

  _handleLicensingUpdate(message) {
    if (message && message.hasOwnProperty("isAuthorized")) {
      const previousAuthorized = this.authorized;
      const currentAuthorized = message.isAuthorized;

      // detect licensing change
      if (previousAuthorized !== currentAuthorized) {
        this.authorized = message.isAuthorized;

        this._sendEvent({
          "event": message.isAuthorized ? "authorized": "unauthorized",
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


  _isCompanyWhiteListed(companyId) {
    if (!companyId || typeof companyId !== "string") {return false;}

    // "Rise Vision Inc":  f114ad26-949d-44b4-87e9-8528afc76ce4
    // "*DO NOT DELETE* Rise Vision Templates": 7fa5ee92-7deb-450b-a8d5-e5ed648c575f

    const whiteList = ["f114ad26-949d-44b4-87e9-8528afc76ce4", "7fa5ee92-7deb-450b-a8d5-e5ed648c575f"];

    return whiteList.includes(companyId);
  }

  /*
  PUBLIC API
   */

  requestAuthorization() {
    // no company id, get authorization from licensing module
    if (!this.companyId || typeof this.companyId !== "string") {
      if (this.authorized !== null) {
        // already know status, send it
        this._sendEvent({"event": this.authorized ? "authorized": "unauthorized"});
      } else {
        // listen for licensing messages
        this._bindReceiveMessagesHandler();
        // request licensing authorization from Licensing module
        this._sendLicensingRequest();
      }

      return;
    }

    // company is white listed, consider it authorized
    if (this._isCompanyWhiteListed(this.companyId)) {
      this.authorized = true;
      return this._sendEvent({"event": "authorized"});
    }

    //TODO: check session storage
  }

  isAuthorized() {
    return this.authorized;
  }
}
