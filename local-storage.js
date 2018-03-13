export default class LocalStorage {
  constructor(localMessaging) {
    this.localMessaging = localMessaging;
    this.authorized = null;

    this._bindReceiveMessagesHandler();
  }

  _bindReceiveMessagesHandler() {
    this.localMessaging.receiveMessages((message) => { this._handleMessage(message) });
  }

  _handleMessage(message) {
    if (!message || !message.topic) {return;}

    switch (message.topic.toUpperCase()) {
      case "STORAGE-LICENSING-UPDATE":
        return this._handleLicensingUpdate(message);
    }
  }

  _handleLicensingUpdate(message) {
    if (message && message.userFriendlyStatus) {
      console.log(`Authorization status changed - ${message.userFriendlyStatus}`);
      this.authorized = message.isAuthorized;
    } else {
      console.log(`Error: Invalid STORAGE-LICENSING-UPDATE message - ${message}`);
    }
  }

  isAuthorized() {
    return this.authorized;
  }

  isConnected() {
    return this.localMessaging.canConnect();
  }

  sendLicensingRequest() {
    this.localMessaging.broadcastMessage({topic: "storage-licensing-request"});
  }
}
