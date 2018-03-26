/* eslint no-return-assign: "off" */

import ExternalLogger from './external-logger';

export default class Logger {
  constructor(config, localMessaging) {
    this.config = config;
    this.localMessaging = localMessaging;
    this.externalLogger = new ExternalLogger(this.localMessaging, this.config.bqProjectName, this.config.bqDataset, this.config.failedEntryFile, this.config.bqTable, this.config.componentName, this.config.componentId);
  }

  getLocalMessaging() {
    return this.localMessaging;
  }

  canConnectToLMS() {
    return this.getLocalMessaging().canConnect();
  }

  playlistEvent(eventDetails, data) {
    this._external('Playlist Event', eventDetails);
  }

  evt(evt, eventDetails, data) {
    this._external(evt, eventDetails);
  }

  error(eventDetails, data) {
    console.log(eventDetails);
    this._external('Error', eventDetails, data);
  }

  _external(evt, eventDetails, data) {
    if (this.getLocalMessaging() && this.canConnectToLMS()) {
      this.externalLogger.log(evt, this._constructDetails(eventDetails, data = {}));
    }
  }

  _constructDetails(eventDetails, data) {
    return Object.assign({
      'event_details': eventDetails,
      'display_id': this.config.displayId || 'preview',
      'company_id': this.config.companyId || 'unknown',
      'version': this.config.componentVersion || 'unknown'
    }, data);
  }
}
