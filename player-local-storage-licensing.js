export default class PlayerLocalStorageLicensing {
  constructor(localMessaging, eventsHandler, companyId = "", env = "prod") {
    this.localMessaging = localMessaging;
    this.eventsHandler = eventsHandler;
    this.companyId = companyId;
    this.env = env;
    this.authorized = null;

    this.SESSION_STORAGE_NAME = "storageLicensingStatus";
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

  _sendStatusEvent(status) {
    this._sendEvent({"event": status ? "authorized": "unauthorized"});
  }

  _isCompanyWhiteListed(companyId) {
    if (!companyId || typeof companyId !== "string") {return false;}

    // "Rise Vision Inc":  f114ad26-949d-44b4-87e9-8528afc76ce4
    // "*DO NOT DELETE* Rise Vision Templates": 7fa5ee92-7deb-450b-a8d5-e5ed648c575f

    const whiteList = ["f114ad26-949d-44b4-87e9-8528afc76ce4", "7fa5ee92-7deb-450b-a8d5-e5ed648c575f"];

    return whiteList.includes(companyId);
  }

  _supportsSessionStorage() {
    try {
      return "sessionStorage" in window && window.sessionStorage !== null;
    } catch ( e ) {
      return false;
    }
  }

  _getCachedStatus() {
    return JSON.parse( sessionStorage.getItem( this.SESSION_STORAGE_NAME + "-" + this.companyId ) );
  }

  _setCachedStatus( data ) {
    try {
      sessionStorage.setItem( this.SESSION_STORAGE_NAME + "-" + this.companyId, JSON.stringify( data ) );
    } catch ( e ) {
      console.warn( e.message ); // eslint-disable-line no-console
    }
  }

  _setStatus( status ) {
    if ( this._supportsSessionStorage() ) {
      const now = new Date();

      this._setCachedStatus( { status: status, timestamp: now.getTime() } );
    }

    this.authorized = status;
  }

  _hasPassedTwentyFourHours( timestamp ) {
    const twentyFourInMilliseconds = 24 * 60 * 60 * 1000;
    const now = new Date();

    return now.getTime() > ( timestamp + twentyFourInMilliseconds );
  }

  _getServerURL() {
    const productionUrl = "https://store-dot-rvaserver2.appspot.com";
    const testingUrl = "https://store-dot-rvacore-test.appspot.com";
    const serverUrl = (this.env !== "test") ? productionUrl : testingUrl;

    return `${serverUrl}/v1/widget/auth?cid=${encodeURIComponent(this.companyId)}&pc=b0cba08a4baa0c62b8cdc621b6f6a124f89a03db`
  }

  _handleLicensingResponse(responseText) {
    try {
      const responseObject = JSON.parse(responseText);

      this._setStatus(responseObject.authorized);
      this._sendStatusEvent(responseObject.authorized);
    }
    catch(err) {
      this._sendEvent({"event": "authorization-error", "detail": (typeof err === "string") ? err : JSON.stringify(err)});
    }
  }

  _handleLicensingRequestError(requestStatus) {
    this._sendEvent({"event": "authorization-error", "detail": {statusCode: requestStatus}});
  }

  _makeLicensingRequest() {
    const xmlhttp = new XMLHttpRequest();
    const serverUrl = this._getServerURL();

    xmlhttp.onreadystatechange = () => {
      try {
        if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
          this._handleLicensingResponse(xmlhttp.responseText);
        } else {
          this._handleLicensingRequestError(xmlhttp.status);
        }
      } catch (err) {
        console.debug("Caught exception: ", err.message);
      }
    };

    xmlhttp.open("GET", serverUrl);
    xmlhttp.send();
  }

  _requestAuthorizationDirectly() {
    console.log( "-------------D" );
    if (this._supportsSessionStorage()) {
      console.log( "-------------E" );
      const subscriptionStatus = this._getCachedStatus();

      console.log( subscriptionStatus );
      if (!subscriptionStatus || this._hasPassedTwentyFourHours(subscriptionStatus.timestamp)) {
        console.log( "-------------F" );
        this._makeLicensingRequest();
      } else {
        console.log( "-------------G" );
        this.authorized = subscriptionStatus.status;
        this._sendStatusEvent(this.authorized);
      }
    } else {
      console.log( "-------------E2" );
      // legacy player using old chrome browser
      if (this.authorized !== null) {
        // already know status, send it
        this._sendStatusEvent(this.authorized);
      } else {
        this._makeLicensingRequest();
      }
    }
  }

  /*
  PUBLIC API
   */

  requestAuthorization() {
    console.log( "-------------A" );
    // no company id, get authorization from licensing module
    if (!this.companyId || typeof this.companyId !== "string") {
      if (this.authorized !== null) {
        // already know status, send it
        this._sendStatusEvent(this.authorized);
      } else {
        // listen for licensing messages
        this._bindReceiveMessagesHandler();
        // request licensing authorization from Licensing module
        this._sendLicensingRequest();
      }

      return;
    }

    console.log( "-------------B" );
    // company is white listed, consider it authorized
    if (this._isCompanyWhiteListed(this.companyId)) {
      this.authorized = true;
      return this._sendEvent({"event": "authorized"});
    }

    console.log( "-------------C" );
    this._requestAuthorizationDirectly();
  }

  isAuthorized() {
    return this.authorized;
  }
}
