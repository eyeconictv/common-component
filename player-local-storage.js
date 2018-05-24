export default class PlayerLocalStorage {
  constructor(localMessaging, eventsHandler) {
    this.localMessaging = localMessaging;
    this.eventsHandler = eventsHandler;
    this.requiredModulesAvailable = false;
    this.requiredModulesTries = 0;
    this.licensingTimer = null;
    this.licensingTries = 0;
    this.authorized = null;
    this.files = new Map();
    this.folders = new Set();

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
      case "FILE-UPDATE":
        return this._handleFileUpdate( message );
      case "FILE-ERROR":
        return this._handleFileError( message );
    }
  }

  _handleClientListUpdate(message) {
    const clients = message.clients;
    const required = ["local-storage", "licensing"];

    // ignore this client list message if flag already set and licensing request already sent
    if (this.requiredModulesAvailable) { return; }

    let running = required.every((val) => clients.includes(val));

    if (running) {
      this.requiredModulesAvailable = true;
      this._sendLicensingRequest();
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

  _handleFileUpdate(message) {
    if ( !message || !message.filePath || !message.status ) {return;}

    const {filePath, status, osurl} = message;
    const watchedFileStatus = this._getWatchedFileStatus(filePath);

    // file is not being watched
    if (!watchedFileStatus) {return;}
    // status hasn't changed
    if (watchedFileStatus === status) {return;}

    this.files.set(filePath, status);

    switch (status.toUpperCase()) {
      case "CURRENT":
        this._sendEvent({"event": "file-available", filePath, "fileUrl": osurl});
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

  _watchFolder(folderPath) {
    this.folders.add(folderPath);
    this.localMessaging.broadcastMessage({
      "topic": "WATCH",
      "filePath": folderPath
    });
  }

  _isFolderPath(path) {
    return path.substring(path.length - 1) === "/";
  }

  _getWatchedFileStatus(filePath) {
    let fileStatus = this.files.get(filePath);

    if (!fileStatus) {
      for (let folderPath of this.folders) {
        if (filePath.includes(folderPath)) {
          // this is a file from a watched folder, add to file list and mark its status UNKNOWN
          this.files.set(filePath, "UNKNOWN");
          fileStatus = "UNKNOWN";
          break;
        }
      }
    }

    return fileStatus;
  }

  /*
  PUBLIC API
   */

  watchFiles(filePaths) {
    if (!this.isAuthorized() || !this.isConnected() || !filePaths) {return;}

    if (typeof filePaths === "string") {
      if (this._isFolderPath(filePaths)) {
        if (!this.folders.has(filePaths)) {
          this._watchFolder(filePaths);
        }
      } else {
        if (!this.files.has(filePaths)) {
          this._watchFile(filePaths);
        }
      }
    } else if (Array.isArray(filePaths)) {
      const filesNotWatched = filePaths.filter(path => !this.files.has(path));
      filesNotWatched.forEach((path) => {
        if (this._isFolderPath(path)) {
          if (!this.folders.has(path)) {
            this._watchFolder(path);
          }
        } else {
          this._watchFile(path);
        }
      });
    }
  }

  isAuthorized() {
    return this.authorized;
  }

  isConnected() {
    return this.localMessaging.canConnect();
  }
}
