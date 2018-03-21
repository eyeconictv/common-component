export default class LocalMessaging {
  constructor() {
    try {
      if ( top.RiseVision.Viewer.LocalMessaging ) {
        this.localMessaging = top.RiseVision.Viewer.LocalMessaging;
      }
    } catch ( err ) {
      console.log( "common-component: ws-client", err );
    }
  }
  broadcastMessage(message) {
    this._safeWrite(message);
  }

  canConnect() {
    if (this.localMessaging) {
      return this.localMessaging.canConnect();
    } else {
      return false;
    }
  }

  getModuleClientList() {
    this._safeWrite({topic: "client-list-request"});
  }

  receiveMessages(handler) {
    if (!handler || typeof handler !== "function") {return;}

    if (this.localMessaging) {
      this.localMessaging.receiveMessages(handler);
    }
  }

  _safeWrite(message) {
    if (this.localMessaging) {
      this.localMessaging.write(message);
    }
  }
}
