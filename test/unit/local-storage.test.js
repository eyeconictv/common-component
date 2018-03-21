import LocalStorage from "../../local-storage";
import LocalMessaging from "../../local-messaging";

describe("LocalStorage", () => {
  let localStorage = null;
  let localMessaging = null;
  let eventHandler = null;

  function mockViewerLocalMessaging(connected) {
    top.RiseVision = {};
    top.RiseVision.Viewer = {};
    top.RiseVision.Viewer.LocalMessaging = {
      write: (message) => {},
      receiveMessages: (handler) => {},
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
      localStorage = new LocalStorage(localMessaging, eventHandler);

      expect(eventHandler).toHaveBeenCalledWith({
        "event": "no-connection"
      })
    });

    it("should send client list request when LM client connection", ()=> {
      mockViewerLocalMessaging(true);

      localMessaging = new LocalMessaging();
      localStorage = new LocalStorage(localMessaging, eventHandler);

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
      localStorage = new LocalStorage(localMessaging, eventHandler);
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

        localStorage._handleMessage(message);

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
        localStorage._handleMessage(message);
        jest.advanceTimersByTime(1000);
        expect(eventHandler).toHaveBeenCalledTimes(0);
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith({
          "topic": "client-list-request"
        });

        top.RiseVision.Viewer.LocalMessaging.write.mockClear();
        localStorage._handleMessage(message);
        jest.advanceTimersByTime(1000);
        expect(eventHandler).toHaveBeenCalledTimes(0);
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith({
          "topic": "client-list-request"
        });

        top.RiseVision.Viewer.LocalMessaging.write.mockClear();
        localStorage._handleMessage(message);
        jest.advanceTimersByTime(1000);
        expect(eventHandler).toHaveBeenCalledTimes(0);
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith({
          "topic": "client-list-request"
        });


        top.RiseVision.Viewer.LocalMessaging.write.mockClear();
        localStorage._handleMessage(message);
        jest.advanceTimersByTime(1000);
        expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledTimes(0);
        expect(eventHandler).toHaveBeenCalledWith({
          "event": "no-required-modules"
        })
      });
    });

    describe("STORAGE-LICENSING-UPDATE", () => {
      it("should update authorization and execute 'licensing' event on event handler", () => {
        const message = {
          "from": "storage-module",
          "topic": "storage-licensing-update",
          "isAuthorized": false,
          "userFriendlyStatus": "unauthorized"
        };

        localStorage._handleMessage(message);

        expect(localStorage.isAuthorized()).toBeFalsy;
        expect(eventHandler).toHaveBeenCalledWith({
          "event": "unauthorized"
        });

        message.isAuthorized = true;
        message.userFriendlyStatus = "authorized";
        eventHandler.mockClear();

        localStorage._handleMessage(message);

        expect(localStorage.isAuthorized()).toBeTruthy;
        expect(eventHandler).toHaveBeenCalledWith({
          "event": "authorized"
        });
      });
    });

  });

});
