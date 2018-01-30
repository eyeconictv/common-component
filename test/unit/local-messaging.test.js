import LocalMessaging from "../../local-messaging";

describe("LocalMessaging", () => {
  let localMessaging = null;
  beforeEach(() => {
    top.RiseVision = {};
    top.RiseVision.Viewer.LocalMessaging = {
      write: (message) => {},
      receiveMessages: (handler) => {},
      canConnect: () => {return true;}
    };

    top.RiseVision.Viewer.LocalMessaging.write = jest.genMockFn();
    top.RiseVision.Viewer.LocalMessaging.receiveMessages = jest.genMockFn();

    localMessaging = new LocalMessaging();
  });

  describe("broadcastMessage", () => {
    it("should call RiseVision.Viewer.LocalMessaging.write() on top window with message", () => {

      localMessaging.broadcastMessage({
        "topic": "WATCH",
        "filePath": "test-file.jpg"
      });

      expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith({
        "topic": "WATCH",
        "filePath": "test-file.jpg"
      });
    });
  });

  describe("getModuleClientList", () => {
    it("should call RiseVision.Viewer.LocalMessaging.write() on top window with correct message topic", () => {
      localMessaging.getModuleClientList();

      expect(top.RiseVision.Viewer.LocalMessaging.write).toHaveBeenCalledWith({
        "topic": "client-list-request"
      });

    });

  });

  describe("receiveMessages", () => {
    it("should call RiseVision.Viewer.LocalMessaging.receiveMessages() with handler function", () => {
      const handlerSpy = jest.genMockFn();

      localMessaging.receiveMessages(handlerSpy);

      expect(top.RiseVision.Viewer.LocalMessaging.receiveMessages).toHaveBeenCalledWith(handlerSpy);

    });

  });

  describe("canConnect", () => {
    it("should return true", () => {
      expect(localMessaging.canConnect()).toBeTruthy;
    });
  });

});
