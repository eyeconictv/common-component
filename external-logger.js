let displaySettings = {};
let companySettings = {};

export default class ExternalLogger {
  constructor(localMessaging, projectName, datasetName, failedEntryFile, table, componentName) {
    this.localMessaging = localMessaging;

    this.projectName = projectName;
    this.datasetName = datasetName;
    this.failedEntryFile = failedEntryFile;
    this.table = table;
    this.componentName = componentName;
  }

  _validateMessage(message, detail) {
    let error = "";

    if (!message){
      error = "Message is required";
    } else if (!message.data.projectName) {
      error = "BQ project name is required";
    } else if (!message.data.datasetName) {
      error = "BQ dataset name is required";
    } else if (!message.data.failedEntryFile) {
      error = "BQ failed entry file is required";
    } else if (!message.data.table) {
      error = "BQ table is required";
    } else if (!message.data.data.event) {
      error = "BQ event is required";
    } else if (!Object.keys(detail).length){
      error = "BQ detail is required";
    }

    return error;
}

  _constructMessage(evt, detail) {
    const displayId = displaySettings.displayid || displaySettings.tempdisplayid || detail.display_id || "preview";
    const companyId = companySettings.companyid || companySettings.tempcompanyid || detail.company_id || "";

    const data = Object.assign({}, {"event": evt, "display_id": displayId, "company_id": companyId, "component_name": this.componentName}, detail);

    return {
        "topic": "log",
        "data": {
          "projectName": this.projectName,
          "datasetName": this.datasetName,
          "failedEntryFile": this.failedEntryFile,
          "table": this.table,
          "data": data
        }
      };
  }

  log(evt, detail) {
    if (!this.localMessaging) { return; }

    const message = this._constructMessage(evt, detail);

    const errorMessage = this._validateMessage(message, detail);

    if (!errorMessage && this.localMessaging.canConnect()) {
      this.localMessaging.broadcastMessage(message);
    } else {
      console.log(`external-logger error - ${this.componentName + " component" || "source component undefined"}: ${errorMessage}`);
    }
  }

  setDisplaySettings(settings) {
    displaySettings = settings;
  }

  setCompanySettings(settings) {
    companySettings = settings;
  }
}
