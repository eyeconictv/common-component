export default class LocalMessaging {
  constructor() {
    this.localMessaging = top.RiseVision.Viewer.LocalMessaging;
  }
  broadcastMessage(message) {
    this._safeWrite(message);
  }

  canConnect() {
    try {
      if (this.localMessaging) {
        return this.localMessaging.canConnect();
      }
    } catch (err) {
      console.log( "common-component: ws-client", err );
    }
  }

  getModuleClientList() {
    this._safeWrite({topic: "client-list-request"});
  }

  receiveMessages(handler) {
    if (!handler || typeof handler !== "function") {return;}

    try {
      if (this.localMessaging) {
        this.localMessaging.receiveMessages(handler);
      }
    } catch (err) {
      console.log( "common-component: ws-client", err );
    }
  }

  _safeWrite(message) {
    try {
      if (this.localMessaging) {
        this.localMessaging.write(message);
      }
    } catch (err) {
      console.log( "common-component: ws-client", err );
    }
  }
}
