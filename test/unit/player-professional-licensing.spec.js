import PlayerProfessionalLicensing from "../../player-professional-licensing";
import Logger from "../../logger";
import LocalMessaging from '../../local-messaging';
import Config from "../../config/config";

describe("Player Professional Licensing", () => {
  let playerProfessionallicensing = null;
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
    playerProfessionallicensing = {
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
      playerProfessionallicensing = new PlayerProfessionalLicensing(localMessaging, logger, componentId);

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

        playerProfessionallicensing._handleMessage(message);

        expect(playerProfessionallicensing.isAuthorized()).toBeFalsy();
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith({
          "topic": "licensing-update",
          "isAuthorized": false,
          "userFriendlyStatus": "unauthorized"
        });

        message.isAuthorized = true;
        message.userFriendlyStatus = "authorized";

        playerProfessionallicensing._handleMessage(message);

        expect(playerProfessionallicensing.isAuthorized()).toBeTruthy();
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

        expect(playerProfessionallicensing.isAuthorized()).toBeNull();

        playerProfessionallicensing._handleMessage(message);

        expect(playerProfessionallicensing.isAuthorized()).toBeTruthy();
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledTimes(1);

        playerProfessionallicensing._handleMessage(message);
        expect(playerProfessionallicensing.isAuthorized()).toBeTruthy();
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledTimes(1);

      });
    });
  });

});
