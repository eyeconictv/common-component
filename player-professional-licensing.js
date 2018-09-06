export default class Licensing {
  constructor(localMessaging, logger, authorizationEventsHandler, config) {
    this.localMessaging = localMessaging;
    this.logger = logger;
    this.config = config;
    this.authorized = null;
    this.authorizationEventsHandler = authorizationEventsHandler;
  }

  _sendStatusEvent(status) {
    this._sendEvent({"event": status ? "authorized": "unauthorized"});
  }

  _bindReceiveMessagesHandler() {
    this.localMessaging.receiveMessages((message) => { this._handleMessage(message) });
  }

  _sendLicensingRequest() {
    this.localMessaging.broadcastMessage({topic: "rpp-licensing-request"});
  }

  _handleMessage(message) {
    if (!message || !message.topic) {return;}

    switch (message.topic.toUpperCase()) {
      case "RPP-LICENSING-UPDATE":
        return this._handleLicensingUpdate(message);
    }
  }

  _setStatus(status) {
    this.authorized = status;
  }

  _handleLicensingUpdate(message) {
    if (message && message.hasOwnProperty("isAuthorized")) {
      const previousAuthorized = this.authorized;
      const currentAuthorized = message.isAuthorized;

      // detect licensing change
      if (previousAuthorized !== currentAuthorized) {
        this.authorized = message.isAuthorized;

        this._sendStatusEvent(message.isAuthorized);
      }
    } else {
      console.log(`Error: Invalid RPP-LICENSING-UPDATE message - ${message}`);
    }
  }

  _handleLicensingResponse(responseText) {
    try {
      const responseObject = JSON.parse(responseText);

      this._setStatus(responseObject.authorized);
      this._sendStatusEvent(responseObject.authorized);
    }
    catch(err) {
      this.logger.evt({"event": "authorization-error", "detail": (typeof err === "string") ? err : JSON.stringify(err)});
    }
  }

  _handleLicensingRequestError(requestStatus) {
    this.logger.evt({"event": "authorization-error", "detail": {statusCode: requestStatus}});
  }

  _sendEvent(event) {
    if (!this.authorizationEventsHandler || typeof this.authorizationEventsHandler !== "function" || !event) {return;}
    this.authorizationEventsHandler(event);
  }

  /*
  PUBLIC API
   */

  requestAuthorization() {
    if (this.authorized !== null) {
      // already know status, send it
      this._sendStatusEvent(this.authorized);
    } else {
      // listen for licensing messages
      this._bindReceiveMessagesHandler();
      this._sendLicensingRequest();
    }
  }

  isAuthorized() {
    return this.authorized;
  }
}
