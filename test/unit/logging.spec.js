import Logger from "../../logger";
import Config from "../../config/config";
import LocalMessaging from '../../local-messaging';

let config = null;
let componentId = "componentIdTest";
let logger = null;
let localMessaging = null;

describe("Logging - Unit", () => {
  beforeAll(() => {
    top.RiseVision = {};
    top.RiseVision.Viewer = {};
    top.RiseVision.Viewer.LocalMessaging = {
      write: (message) => {},
      receiveMessages: (handler) => {},
      canConnect: () => {return true;},
    };
  });

  beforeEach(() => {
    const shadowRoot = {};
    shadowRoot.appendChild = jest.genMockFn();

    config = new Config();
    config.setComponentId(componentId);
    
    localMessaging = new LocalMessaging();
    logger = new Logger(config, localMessaging);

    logger.externalLogger.log = jest.genMockFn();
    console.log = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should log external error message", () => {
    const expectedDetails = {"company_id": "unknown", "display_id": "preview", "event_details": "error message", "version": "unknown"};

    logger.error("error message");

    expect(logger.externalLogger.log).toHaveBeenCalledWith("Error", expectedDetails);
  });

  it("should log external playlistEvent message", () => {
    const expectedDetails = {"company_id": "unknown", "display_id": "preview", "event_details": "error message", "version": "unknown"};

    logger.playlistEvent("error message");

    expect(logger.externalLogger.log).toHaveBeenCalledWith("Playlist Event", expectedDetails);
  });

  it("should log standard external message", () => {
    const expectedDetails = {"company_id": "unknown", "display_id": "preview", "event_details": "error message", "version": "unknown"};

    logger._external("standard", "error message");

    expect(logger.externalLogger.log).toHaveBeenCalledWith("standard", expectedDetails);
  });
});
