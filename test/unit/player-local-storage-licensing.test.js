import LocalMessaging from "../../local-messaging";
import PlayerLocalStorageLicensing from "../../player-local-storage-licensing";
import PlayerLocalStorage from "../../player-local-storage";

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

  describe("_getServerURL", () => {

    it("should return correct production Store request URL", () => {
      localMessaging = new LocalMessaging();
      playerLocalStorageLicensing = new PlayerLocalStorageLicensing(localMessaging, eventHandler, "abc123");

      expect(playerLocalStorageLicensing._getServerURL()).toBe("https://store-dot-rvaserver2.appspot.com/v1/widget/auth?cid=abc123&pc=b0cba08a4baa0c62b8cdc621b6f6a124f89a03db");
    });

    it("should return correct test Store request URL", () => {
      localMessaging = new LocalMessaging();
      playerLocalStorageLicensing = new PlayerLocalStorageLicensing(localMessaging, eventHandler, "abc123", "test");

      expect(playerLocalStorageLicensing._getServerURL()).toBe("https://store-dot-rvacore-test.appspot.com/v1/widget/auth?cid=abc123&pc=b0cba08a4baa0c62b8cdc621b6f6a124f89a03db");
    });

  });

  describe("_sendStatusEvent", () => {
    beforeEach(()=>{
      localMessaging = new LocalMessaging();
      playerLocalStorageLicensing = new PlayerLocalStorageLicensing(localMessaging, eventHandler);
    });

    it("should send unauthorized status event", () => {
      playerLocalStorageLicensing._sendStatusEvent(false);
      expect(eventHandler).toHaveBeenCalledWith({
        event: "unauthorized"
      });
    });

    it("should send authorized status event", () => {
      playerLocalStorageLicensing._sendStatusEvent(true);
      expect(eventHandler).toHaveBeenCalledWith({
        event: "authorized"
      });
    });

  });

  describe("_handleLicensingResponse", () => {
    let storageStub = null;

    beforeEach(()=>{
      localMessaging = new LocalMessaging();
      playerLocalStorageLicensing = new PlayerLocalStorageLicensing(localMessaging, eventHandler);
      storageStub = jest.spyOn(playerLocalStorageLicensing, "_supportsSessionStorage").mockImplementation(() => true);
    });

    afterEach(() => {
      eventHandler.mockClear();
      storageStub.mockReset();
      storageStub.mockRestore();
    });

    it("should cache status and execute event handler with status", () => {
      const stub = jest.spyOn(playerLocalStorageLicensing, "_setCachedStatus").mockImplementation(() => null);

      playerLocalStorageLicensing._handleLicensingResponse('{"authorized":true}');

      expect(stub).toHaveBeenCalledTimes(1);
      expect(stub.mock.calls[0][0]).toHaveProperty("timestamp");
      expect(stub.mock.calls[0][0].status).toBeTruthy();
      expect(eventHandler).toHaveBeenCalledWith({event: "authorized"});
    });

    it("should execute event handler with authorization-error when JSON parsing of response text fails", () => {
      playerLocalStorageLicensing._handleLicensingResponse('"authorized":true');

      expect(eventHandler.mock.calls[0][0]).toHaveProperty("detail");
      expect(eventHandler.mock.calls[0][0].detail).toBeTruthy();
      expect(eventHandler.mock.calls[0][0].event).toEqual("authorization-error");
    });
  });

  describe("_handleLicensingRequestError", () => {
    beforeEach(()=>{
      localMessaging = new LocalMessaging();
      playerLocalStorageLicensing = new PlayerLocalStorageLicensing(localMessaging, eventHandler);
    });

    afterEach(() => {
      eventHandler.mockClear();
    });

    it("should execute event handler with authorization-error", () => {
      playerLocalStorageLicensing._handleLicensingRequestError(500);

      expect(eventHandler).toHaveBeenCalledWith({event: "authorization-error", detail: {statusCode: 500}});
    });
  });

  describe("_requestAuthorizationDirectly", () => {

    describe("session storage supported", () => {

      let storageStub = null;

      beforeEach(()=>{
        localMessaging = new LocalMessaging();
        playerLocalStorageLicensing = new PlayerLocalStorageLicensing(localMessaging, eventHandler, "abc123");
        storageStub = jest.spyOn(playerLocalStorageLicensing, "_supportsSessionStorage").mockImplementation(() => true);
      });

      afterEach(() => {
        eventHandler.mockClear();
        storageStub.mockReset();
        storageStub.mockRestore();
      });

      it("should make licensing request if no cached status available", () => {
        const stub1 = jest.spyOn(playerLocalStorageLicensing, "_getCachedStatus").mockImplementation(() => null);
        const stub2 = jest.spyOn(playerLocalStorageLicensing, "_hasPassedTwentyFourHours").mockImplementation(() => false);
        const stub3 = jest.spyOn(playerLocalStorageLicensing, "_makeLicensingRequest").mockImplementation(() => null);

        playerLocalStorageLicensing.requestAuthorization();

        expect(stub3).toHaveBeenCalledTimes(1);

        stub1.mockReset();
        stub2.mockReset();
        stub3.mockReset();
        stub1.mockRestore();
        stub2.mockRestore();
        stub3.mockRestore();
      });

      it("should make licensing request if timestamp passed 24 hours", () => {
        const stub1 = jest.spyOn(playerLocalStorageLicensing, "_getCachedStatus").mockImplementation(() => { return {status: true, timestamp: 123456}});
        const stub2 = jest.spyOn(playerLocalStorageLicensing, "_hasPassedTwentyFourHours").mockImplementation(() => true);
        const stub3 = jest.spyOn(playerLocalStorageLicensing, "_makeLicensingRequest").mockImplementation(() => null);

        playerLocalStorageLicensing.requestAuthorization();

        expect(stub3).toHaveBeenCalledTimes(1);

        stub1.mockReset();
        stub2.mockReset();
        stub3.mockReset();
        stub1.mockRestore();
        stub2.mockRestore();
        stub3.mockRestore();
      });

      it("should execute event handler with cached session storage status", () => {
        const stub1 = jest.spyOn(playerLocalStorageLicensing, "_getCachedStatus").mockImplementation(() => { return {status: true, timestamp: 123456}});
        const stub2 = jest.spyOn(playerLocalStorageLicensing, "_hasPassedTwentyFourHours").mockImplementation(() => false);
        const stub3 = jest.spyOn(playerLocalStorageLicensing, "_makeLicensingRequest").mockImplementation(() => null);

        expect(playerLocalStorageLicensing.isAuthorized()).toBeNull();

        playerLocalStorageLicensing.requestAuthorization();

        expect(stub3).toHaveBeenCalledTimes(0);
        expect(playerLocalStorageLicensing.isAuthorized()).toBeTruthy();
        expect(eventHandler).toHaveBeenCalledWith({event: "authorized"});

        stub1.mockReset();
        stub2.mockReset();
        stub3.mockReset();
        stub1.mockRestore();
        stub2.mockRestore();
        stub3.mockRestore();
      });

    });

    describe("session storage not supported", () => {
      let storageStub = null;

      beforeEach(()=>{
        localMessaging = new LocalMessaging();
        playerLocalStorageLicensing = new PlayerLocalStorageLicensing(localMessaging, eventHandler, "abc123");
        storageStub = jest.spyOn(playerLocalStorageLicensing, "_supportsSessionStorage").mockImplementation(() => false);
      });

      afterEach(() => {
        eventHandler.mockClear();
        storageStub.mockReset();
        storageStub.mockRestore();
      });

      it("should execute event handler with status if already exists", () => {
        const message = {
          "from": "storage-module",
          "topic": "storage-licensing-update",
          "isAuthorized": true,
          "userFriendlyStatus": "authorized"
        };

        expect(playerLocalStorageLicensing.isAuthorized()).toBeNull();

        playerLocalStorageLicensing._handleMessage(message);
        playerLocalStorageLicensing.requestAuthorization();

        expect(playerLocalStorageLicensing.isAuthorized()).toBeTruthy();
        expect(eventHandler).toHaveBeenCalledWith({event: "authorized"});

      });

      it("should make licensing request if no status available", () => {
        const stub = jest.spyOn(playerLocalStorageLicensing, "_makeLicensingRequest").mockImplementation(() => null);

        playerLocalStorageLicensing.requestAuthorization();

        expect(stub).toHaveBeenCalledTimes(1);

        stub.mockReset();
        stub.mockRestore();
      });
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

      describe("company is not white listed", () => {
        beforeEach(()=>{
          localMessaging = new LocalMessaging();
          playerLocalStorageLicensing = new PlayerLocalStorageLicensing(localMessaging, eventHandler, "abc123");
        });

        afterEach(() => {
          eventHandler.mockClear();
        });

        it("should retrieve status from storage or make request directly", () => {
          const stub = jest.spyOn(playerLocalStorageLicensing, "_requestAuthorizationDirectly").mockImplementation(() => null);

          playerLocalStorageLicensing.requestAuthorization();

          expect(stub).toHaveBeenCalledTimes(1);

          stub.mockReset();
          stub.mockRestore();
        });
      });
    });

  });


});
