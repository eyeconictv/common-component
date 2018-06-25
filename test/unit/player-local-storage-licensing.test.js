import LocalMessaging from "../../local-messaging";
import PlayerLocalStorageLicensing from "../../player-local-storage-licensing";

describe("PlayerLocalStorageLicensing", () => {
  let playerLocalStorageLicensing = null;
  let localMessaging = null;
  let eventHandler = null;

  function mockViewerLocalMessaging(connected) {
    top.RiseVision = {};
    top.RiseVision.Viewer = {};
    top.RiseVision.Viewer.LocalMessaging = {
      canConnect: () => {return connected;}
    };

    top.RiseVision.Viewer.LocalMessaging.write = jest.genMockFn();
    top.RiseVision.Viewer.LocalMessaging.receiveMessages = jest.genMockFn();
  }

  beforeEach(() => {
    mockViewerLocalMessaging(true);
    eventHandler = jest.genMockFn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("_handleMessage()", () => {

    beforeEach(() => {
      jest.useFakeTimers();
      localMessaging = new LocalMessaging();
      playerLocalStorageLicensing = new PlayerLocalStorageLicensing(localMessaging, eventHandler);
    });

    afterEach(() => {
      jest.clearAllTimers();
    });

    describe("STORAGE-LICENSING-UPDATE", () => {
      beforeEach(()=>{
        eventHandler.mockClear();
      });

      it("should update authorization and execute 'licensing' event on event handler", () => {
        const message = {
          "from": "storage-module",
          "topic": "storage-licensing-update",
          "isAuthorized": false,
          "userFriendlyStatus": "unauthorized"
        };

        playerLocalStorageLicensing._handleMessage(message);

        expect(playerLocalStorageLicensing.isAuthorized()).toBeFalsy();
        expect(eventHandler).toHaveBeenCalledWith({
          "event": "unauthorized"
        });

        message.isAuthorized = true;
        message.userFriendlyStatus = "authorized";
        eventHandler.mockClear();

        playerLocalStorageLicensing._handleMessage(message);

        expect(playerLocalStorageLicensing.isAuthorized()).toBeTruthy();
        expect(eventHandler).toHaveBeenCalledWith({
          "event": "authorized"
        });
      });

      it("should not update authorization or execute event on handler if authorization hasn't changed", () => {
        const message = {
          "from": "storage-module",
          "topic": "storage-licensing-update",
          "isAuthorized": true,
          "userFriendlyStatus": "authorized"
        };

        expect(playerLocalStorageLicensing.isAuthorized()).toBeNull();

        playerLocalStorageLicensing._handleMessage(message);

        expect(playerLocalStorageLicensing.isAuthorized()).toBeTruthy();
        expect(eventHandler).toHaveBeenCalledTimes(1);

        playerLocalStorageLicensing._handleMessage(message);
        expect(playerLocalStorageLicensing.isAuthorized()).toBeTruthy();
        expect(eventHandler).toHaveBeenCalledTimes(1);

      });
    });

  });

  describe("_isCompanyWhiteListed", () => {
    beforeEach(() => {
      localMessaging = new LocalMessaging();
      playerLocalStorageLicensing = new PlayerLocalStorageLicensing(localMessaging, eventHandler);
    });

    it("should return false when company id is empty or not a string", () => {
      expect(playerLocalStorageLicensing._isCompanyWhiteListed()).toBeFalsy();
      expect(playerLocalStorageLicensing._isCompanyWhiteListed(["test"])).toBeFalsy();

    });

    it("should return true when company id is in whitelist", () => {
      expect(playerLocalStorageLicensing._isCompanyWhiteListed("f114ad26-949d-44b4-87e9-8528afc76ce4")).toBeTruthy();
      expect(playerLocalStorageLicensing._isCompanyWhiteListed("7fa5ee92-7deb-450b-a8d5-e5ed648c575f")).toBeTruthy();

    });

    it("should return false when company id is not in whitelist", () => {
      expect(playerLocalStorageLicensing._isCompanyWhiteListed("abc-123")).toBeFalsy();
    });

  });

  describe("requestAuthorization", () => {

    describe("no company id provided", () => {

      beforeEach(()=>{
        localMessaging = new LocalMessaging();
        playerLocalStorageLicensing = new PlayerLocalStorageLicensing(localMessaging, eventHandler);
      });

      afterEach(() => {
        eventHandler.mockClear();
      });

      it("should send licensing request and listen for messages", () => {
        playerLocalStorageLicensing.requestAuthorization();

        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith({
          "topic": "storage-licensing-request"
        });

      });

      it("should execute event on handler providing status and not send licensing request when status already available", () => {
        const message = {
          "from": "storage-module",
          "topic": "storage-licensing-update",
          "isAuthorized": true,
          "userFriendlyStatus": "authorized"
        };


        playerLocalStorageLicensing._handleMessage(message);
        playerLocalStorageLicensing.requestAuthorization();
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledTimes(0);

        expect(playerLocalStorageLicensing.isAuthorized()).toBeTruthy();
        expect(eventHandler).toHaveBeenCalledWith({
          "event": "authorized"
        });

      });
    });

    describe("company is white listed", () => {
      afterEach(() => {
        eventHandler.mockClear();
      });

      it("should execute event on handler providing authorized status with f114ad26-949d-44b4-87e9-8528afc76ce4", () => {
        localMessaging = new LocalMessaging();
        playerLocalStorageLicensing = new PlayerLocalStorageLicensing(localMessaging, eventHandler, "f114ad26-949d-44b4-87e9-8528afc76ce4");
        playerLocalStorageLicensing.requestAuthorization();

        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledTimes(0);
        expect(playerLocalStorageLicensing.isAuthorized()).toBeTruthy();
        expect(eventHandler).toHaveBeenCalledWith({
          "event": "authorized"
        });
      });

      it("should execute event on handler providing authorized status with 7fa5ee92-7deb-450b-a8d5-e5ed648c575f", () => {
        localMessaging = new LocalMessaging();
        playerLocalStorageLicensing = new PlayerLocalStorageLicensing(localMessaging, eventHandler, "7fa5ee92-7deb-450b-a8d5-e5ed648c575f");
        playerLocalStorageLicensing.requestAuthorization();

        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledTimes(0);
        expect(playerLocalStorageLicensing.isAuthorized()).toBeTruthy();
        expect(eventHandler).toHaveBeenCalledWith({
          "event": "authorized"
        });
      });
    });

  });


});
