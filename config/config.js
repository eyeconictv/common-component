export default class Config {
  constructor(componentName, bqTable, failedEntryFile) {
    this.componentName = componentName;
    this.componentId = '';
    this.bqProjectName = 'client-side-events';
    this.bqDataset = 'Component_Events';
    this.bqTable = bqTable;
    this.failedEntryFile = failedEntryFile;
    this.displayId = '';
    this.companyId = '';
    this.componentVersion = '';
  }

  setDisplayId(displayId) {
    this.displayId = displayId;
  }

  setCompanyId(companyId) {
    this.companyId = companyId;
  }

  setComponentId(componentId) {
    this.componentId = componentId;
  }

  setComponentVersion(version) {
    this.componentVersion = version;
  }
}
