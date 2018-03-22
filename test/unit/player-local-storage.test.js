import LocalMessaging from "../../local-messaging";
import PlayerLocalStorage from "../../player-local-storage";

describe("PlayerLocalStorage", () => {
  let playerLocalStorage = null;
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

  describe("constructor", () => {
    it("should execute no-connection event on event handler when no LM client connection", ()=> {
      mockViewerLocalMessaging(false);

      localMessaging = new LocalMessaging();
      playerLocalStorage = new PlayerLocalStorage(localMessaging, eventHandler);

      expect(eventHandler).toHaveBeenCalledWith({
        "event": "no-connection"
      })
    });

    it("should send client list request when LM client connection", ()=> {
      mockViewerLocalMessaging(true);

      localMessaging = new LocalMessaging();
      playerLocalStorage = new PlayerLocalStorage(localMessaging, eventHandler);

      expect(eventHandler).toHaveBeenCalledTimes(0);
      expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith({
        "topic": "client-list-request"
      });
    });
  });

  describe("_handleMessage()", () => {

    beforeEach(() => {
      jest.useFakeTimers();
      localMessaging = new LocalMessaging();
      playerLocalStorage = new PlayerLocalStorage(localMessaging, eventHandler);
    });

    afterEach(() => {
      jest.clearAllTimers();
    });

    describe("CLIENT-LIST", () => {
      it("should send STORAGE-LICENSING-REQUEST when required modules are present", () => {
        const message = {
          "topic": "client-list",
          "clients": ["local-messaging", "player-electron", "local-storage", "licensing", "logger"]
        };

        playerLocalStorage._handleMessage(message);

        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith({
          "topic": "storage-licensing-request"
        });
      });

      it("should send CLIENT-LIST-REQUEST 3 more times every 1 second before executing no-required-modules event on event handler", () => {
        const message = {
          "topic": "client-list",
          "clients": ["local-messaging", "player-electron", "logger"]
        };

        top.RiseVision.Viewer.LocalMessaging.write.mockClear();
        playerLocalStorage._handleMessage(message);
        jest.advanceTimersByTime(1000);
        expect(eventHandler).toHaveBeenCalledTimes(0);
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith({
          "topic": "client-list-request"
        });

        top.RiseVision.Viewer.LocalMessaging.write.mockClear();
        playerLocalStorage._handleMessage(message);
        jest.advanceTimersByTime(1000);
        expect(eventHandler).toHaveBeenCalledTimes(0);
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith({
          "topic": "client-list-request"
        });

        top.RiseVision.Viewer.LocalMessaging.write.mockClear();
        playerLocalStorage._handleMessage(message);
        jest.advanceTimersByTime(1000);
        expect(eventHandler).toHaveBeenCalledTimes(0);
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith({
          "topic": "client-list-request"
        });


        top.RiseVision.Viewer.LocalMessaging.write.mockClear();
        playerLocalStorage._handleMessage(message);
        jest.advanceTimersByTime(1000);
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledTimes(0);
        expect(eventHandler).toHaveBeenCalledWith({
          "event": "no-required-modules"
        })
      });
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

        playerLocalStorage._handleMessage(message);

        expect(playerLocalStorage.isAuthorized()).toBeFalsy();
        expect(eventHandler).toHaveBeenCalledWith({
          "event": "unauthorized"
        });

        message.isAuthorized = true;
        message.userFriendlyStatus = "authorized";
        eventHandler.mockClear();

        playerLocalStorage._handleMessage(message);

        expect(playerLocalStorage.isAuthorized()).toBeTruthy();
        expect(eventHandler).toHaveBeenCalledWith({
          "event": "authorized"
        });
      });
    });

    it("should not update authorization or execute event on handler if authorization hasn't changed", () => {
      const message = {
        "from": "storage-module",
        "topic": "storage-licensing-update",
        "isAuthorized": true,
        "userFriendlyStatus": "authorized"
      };

      expect(playerLocalStorage.isAuthorized()).toBeNull();

      playerLocalStorage._handleMessage(message);

      expect(playerLocalStorage.isAuthorized()).toBeTruthy();
      expect(eventHandler).toHaveBeenCalledTimes(1);

      playerLocalStorage._handleMessage(message);
      expect(playerLocalStorage.isAuthorized()).toBeTruthy();
      expect(eventHandler).toHaveBeenCalledTimes(1);

    });

  });

});
