export default class Licensing {
  constructor(localMessaging, logger, config) {
    this.localMessaging = localMessaging;
    this.logger = logger;
    this.config = config;
    this.authorized = null;
  }

  _sendStatusMessage(status) {
    this.localMessaging.broadcastMessage({
      "topic": "licensing-update",
      "isAuthorized": status ? true : false,
      "userFriendlyStatus" : status ? "authorized" : "unauthorized"
    });
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

        this._sendStatusMessage(message.isAuthorized);
      }
    } else {
      console.log(`Error: Invalid RPP-LICENSING-UPDATE message - ${message}`);
    }
  }

  _handleLicensingResponse(responseText) {
    try {
      const responseObject = JSON.parse(responseText);

      this._setStatus(responseObject.authorized);
      this._sendStatusMessage(responseObject.authorized);
    }
    catch(err) {
      this.logger.evt({"event": "authorization-error", "detail": (typeof err === "string") ? err : JSON.stringify(err)});
    }
  }

  _handleLicensingRequestError(requestStatus) {
    this.logger.evt({"event": "authorization-error", "detail": {statusCode: requestStatus}});
  }

  _makeLicensingRequest() {
    const message = {from: config.componentName, topic: 'licensing-request'};
    return localMessaging.broadcastMessage(message);
  }

  _requestAuthorizationDirectly() {
    if (this.authorized !== null) { // already know status, send it
      this._sendStatusMessage(this.authorized);
    } else {
      this._makeLicensingRequest();
    }
  }

  /*
  PUBLIC API
   */

  requestAuthorization() {
    // no company id, get authorization from licensing module
    if (!this.config.companyId || typeof this.config.companyId !== "string") {
      if (this.authorized !== null) {
        // already know status, send it
        this._sendStatusMessage(this.authorized);
      } else {
        // listen for licensing messages
        this._bindReceiveMessagesHandler();
        // request licensing authorization from Licensing module
        this._sendLicensingRequest();
      }

      return;
    }

    // company is white listed, consider it authorized
    if (this._isCompanyWhiteListed(this.config.companyId)) {
      this.authorized = true;
      this._requestAuthorizationDirectly();
    }

    this._requestAuthorizationDirectly();
  }

  isAuthorized() {
    return this.authorized;
  }
}
