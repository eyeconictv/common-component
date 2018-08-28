import Licensing from "../../licensing";
import Logger from "../../logger";
import LocalMessaging from '../../local-messaging';
import Config from "../../config/config";

describe("Licensing", () => {
  let licensing = null;
  let config = null;
  let componentId = "componentIdTest";
  let logger = null;
  let localMessaging = null;

  function mockViewerLocalMessaging(connected) {
    top.RiseVision = {};
    top.RiseVision.Viewer = {};
    top.RiseVision.Viewer.LocalMessaging = {
      write: (message) => {},
      receiveMessages: (handler) => {},
      canConnect: () => {return true;}
    };

    top.RiseVision.Viewer.LocalMessaging.write = jest.genMockFn();
    top.RiseVision.Viewer.LocalMessaging.receiveMessages = jest.genMockFn();
  }

  function mockLicensing(authorized) {
    licensing = {
      requestAuthorization:jest.genMockFn(),
      isAuthorized:()=>{return authorized;}
    };
  }

  beforeEach(() => {
    mockViewerLocalMessaging(true);
    mockLicensing(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("_handleMessage()", () => {

    beforeEach(() => {
      config = new Config();
      config.setComponentId(componentId);

      localMessaging = new LocalMessaging();
      logger = new Logger(config, localMessaging);
      licensing = new Licensing(localMessaging, logger, componentId);

      logger.externalLogger.log = jest.genMockFn();
    });

    afterEach(() => {
    });

    describe("RPP-LICENSING-UPDATE", () => {
      beforeEach(()=>{
      });

      it("should update authorization and execute 'licensing' status update message", () => {
        const message = {
          "from": "storage-component",
          "topic": "rpp-licensing-update",
          "isAuthorized": false,
          "userFriendlyStatus": "unauthorized"
        };

        licensing._handleMessage(message);

        expect(licensing.isAuthorized()).toBeFalsy();
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith({
          "topic": "licensing-update",
          "isAuthorized": false,
          "userFriendlyStatus": "unauthorized"
        });

        message.isAuthorized = true;
        message.userFriendlyStatus = "authorized";

        licensing._handleMessage(message);

        expect(licensing.isAuthorized()).toBeTruthy();
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith({
          "topic": "licensing-update",
          "isAuthorized": true,
          "userFriendlyStatus": "authorized"
        });
      });

      it("should not update authorization or execute event on handler if authorization hasn't changed", () => {
        const message = {
          "from": "storage-module",
          "topic": "rpp-licensing-update",
          "isAuthorized": true,
          "userFriendlyStatus": "authorized"
        };

        expect(licensing.isAuthorized()).toBeNull();

        licensing._handleMessage(message);

        expect(licensing.isAuthorized()).toBeTruthy();
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledTimes(1);

        licensing._handleMessage(message);
        expect(licensing.isAuthorized()).toBeTruthy();
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledTimes(1);

      });
    });
  });

});
