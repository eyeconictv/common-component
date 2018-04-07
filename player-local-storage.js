export default class PlayerLocalStorage {
  constructor(localMessaging, eventsHandler) {
    this.localMessaging = localMessaging;
    this.eventsHandler = eventsHandler;
    this.requiredModulesTries = 0;
    this.licensingTimer = null;
    this.licensingTries = 0;
    this.authorized = null;
    this.files = new Map();

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

  _clearLicensingRequestTimer() {
    clearTimeout(this.licensingTimer);
    this.licensingTimer = null;
  }

  _startLicensingRequestTimer() {
    this.licensingTimer = setTimeout(() => {
      this.licensingTries += 1;

      if (this.licensingTries < 30) {
        // request licensing again after 1 second delay
        this._sendLicensingRequest();
        this._startLicensingRequestTimer();
      } else {
        // attempted 30 times, notify widget/component
        this._sendEvent({
          "event": "licensing-unavailable"
        });
      }
    }, 1000);
  }

  _handleMessage(message) {
    if (!message || !message.topic) {return;}

    switch (message.topic.toUpperCase()) {
      case "CLIENT-LIST":
        return this._handleClientListUpdate(message);
      case "STORAGE-LICENSING-UPDATE":
        return this._handleLicensingUpdate(message);
      case "FILE-UPDATE":
        return this._handleFileUpdate( message );
      case "FILE-ERROR":
        return this._handleFileError( message );
    }
  }

  _handleClientListUpdate(message) {
    const clients = message.clients;
    const required = ["local-storage", "licensing"];

    let running = required.every((val) => clients.includes(val));

    if (running) {
      this._startLicensingRequestTimer();
      return;
    }

    if (this.requiredModulesTries < 30) {
      this.requiredModulesTries += 1;
      // request client list again after 1 second delay
      setTimeout(()=>{this._sendClientListRequest();}, 1000);
    } else {
      // attempted 30 times, notify widget/component
      this._sendEvent({
        "event": "required-modules-unavailable"
      });
    }
  }

  _handleLicensingUpdate(message) {
    if (message && message.userFriendlyStatus) {
      this._clearLicensingRequestTimer();

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

  _handleFileUpdate(message) {
    if ( !message || !message.filePath || !message.status ) {return;}

    const {filePath, status, ospath} = message;
    const watchedFileStatus = this.files.get(filePath);

    // file is not being watched
    if (!watchedFileStatus) {return;}
    // status hasn't changed
    if (watchedFileStatus === status) {return;}

    this.files.set(filePath, status);

    switch (status.toUpperCase()) {
      case "CURRENT":
        this._sendEvent({"event": "file-available", filePath, "fileUrl": ospath.startsWith("http") ? ospath : `file://${ospath}`});
        break;
      case "STALE":
        this._sendEvent({"event": "file-processing", filePath});
        break;
      case "NOEXIST":
        this._sendEvent({"event": "file-no-exist", filePath});
        break;
      case "DELETED":
        this._sendEvent({"event": "file-deleted", filePath});
        break;
    }
  }

  _handleFileError(message) {
    if (!message || !message.filePath) {return;}

    const {filePath, msg, detail} = message;
    const watchedFile = this.files.get(filePath);

    if (!watchedFile) {return;}

    this._sendEvent({"event": "file-error", filePath, msg, detail});
  }

  _sendEvent(event) {
    if (!this.eventsHandler || typeof this.eventsHandler !== "function" || !event) {return;}
    this.eventsHandler(event);
  }

  _watchFile(filePath) {
    this.files.set(filePath, "UNKNOWN");
    this.localMessaging.broadcastMessage({
      "topic": "WATCH",
      "filePath": filePath
    });
  }

  /*
  PUBLIC API
   */

  watchFiles(filePaths) {
    if (!this.isAuthorized() || !this.isConnected()) {return;}

    if (typeof filePaths === "string") {
      if (!this.files.has(filePaths)) {
        this._watchFile(filePaths);
      }
    } else if (Array.isArray(filePaths)) {
      const filesNotWatched = filePaths.filter(path => !this.files.has(path));
      filesNotWatched.forEach(path => this._watchFile(path));
    }
  }

  isAuthorized() {
    return this.authorized;
  }

  isConnected() {
    return this.localMessaging.canConnect();
  }
}
