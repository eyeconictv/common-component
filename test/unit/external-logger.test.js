import ExternalLogger from "../../external-logger";

describe("ExternalLogger", () => {
  let externalLogger = null;
  beforeEach(() => {
    console.log = jest.fn();

    top.RiseVision = {};
    top.RiseVision.Viewer = {};
    top.RiseVision.Viewer.LocalMessaging = {
      write: (message) => {},
      receiveMessages: (handler) => {},
      canConnect: () => {return true;}
    };

    top.RiseVision.Viewer.LocalMessaging.write = jest.genMockFn();
    top.RiseVision.Viewer.LocalMessaging.receiveMessages = jest.genMockFn();

    externalLogger = new ExternalLogger("project-name", "dataset-name", "failed-entryfile", "table", "component-name");
  });

  describe("initialization", () => {
    it("should create an instance of external-logger with a log function", () => {
      externalLogger = new ExternalLogger("a", "b", "c", "d", "e");
      expect(externalLogger.hasOwnProperty("log")).toBeTruthy;
      expect(externalLogger.projectName).toBe("a");
      expect(externalLogger.datasetName).toBe("b");
      expect(externalLogger.failedEntryFile).toBe("c");
      expect(externalLogger.table).toBe("d");
      expect(externalLogger.componentName).toBe("e");
    });
  });

  describe("message validation", () => {
    it("should not send message to LM and log if message.event is invalid", () => {
      externalLogger.log("", {"detail": "testDetail"});
      expect(console.log).toBeCalledWith("external-logger error - component-name component: BQ event is required");
    });

    it("should not send message to LM and log if message.details is invalid", () => {
      externalLogger.log("event", {});
      expect(console.log).toBeCalledWith("external-logger error - component-name component: BQ detail is required");
    });

    it("should not send message to LM and log if message.data.projectName is invalid", () => {
      externalLogger = new ExternalLogger("", "dataset-name", "failed-entryfile", "table", "component-name");
      externalLogger.log("event", {"detail": "testDetail"});
      expect(console.log).toBeCalledWith("external-logger error - component-name component: BQ project name is required");
    });

    it("should not send message to LM and log if message.data.datasetName is invalid", () => {
      externalLogger = new ExternalLogger("project-name", "", "failed-entryfile", "table", "component-name");
      externalLogger.log("event", {"detail": "testDetail"});
      expect(console.log).toBeCalledWith("external-logger error - component-name component: BQ dataset name is required");
    });

    it("should not send message to LM and log if message.data.failedEntryFile is invalid", () => {
      externalLogger = new ExternalLogger("project-name", "dataset-name", "", "table", "component-name");
      externalLogger.log("event", {"detail": "testDetail"});
      expect(console.log).toBeCalledWith("external-logger error - component-name component: BQ failed entry file is required");
    });
  });

  describe("external logging through LM", () => {
    it("should send message to LM and log to BQ", () => {
      let expectedMessage = {
        topic: 'log',
        from: 'component-name',
        data: {
          'projectName': 'project-name',
          'datasetName': 'dataset-name',
          'failedEntryFile': 'failed-entryfile',
          'table': 'table',
          'data': {
            'event': 'event',
            "detail": "testDetail",
            "display_id": "preview",
            "company_id": ""
          }
        }
      };

      externalLogger.log("event", {"detail": "testDetail"});
      expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith(expectedMessage);
    });
  });
});
