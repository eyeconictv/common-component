const assert = require("assert");
const fs = require("fs");
const {join: pathJoin} = require("path");
const platform = require("rise-common-electron").platform;
const config = require("common-display-module");
const execFile = require("child_process").execFile;

describe("UpdateComponentVersion", ()=>{

  const filePath = pathJoin(__dirname, "../../update-component-version.js");

  describe("when not all params are present", ()=> {
    beforeEach(()=>{
      platform.writeTextFileSync(config.getManifestPath(), `{"rolloutPct": 10, "components": [{"name": "test","version": "2017.10.12.04.45", "url":"https://storage.googleapis.com/install-versions.risevision.com/beta/components/rise-twitter.sh"}]}`);
    });
    afterEach(()=>{
      fs.unlinkSync(config.getManifestPath());
    });

    it("does not update manifest if component name empty", (done) => {
      execFile("node", [filePath, config.getManifestPath(), "", "2017.10.13.21.21", 25], () => {
        assert.deepEqual(config.getManifest(), {rolloutPct: 10, components: [{name: "test",version: "2017.10.12.04.45", url: "https://storage.googleapis.com/install-versions.risevision.com/beta/components/rise-twitter.sh"}]});
        done();
      });
    });

    it("does not update manifest if version is empty", (done) => {
      execFile("node", [filePath, config.getManifestPath(), "test", "", 25], () => {
        assert.deepEqual(config.getManifest(), {rolloutPct: 10, components: [{name: "test",version: "2017.10.12.04.45", url: "https://storage.googleapis.com/install-versions.risevision.com/beta/components/rise-twitter.sh"}]});
        done();
      });
    });

    it("updates manifest when pct is not present", (done)=>{
      execFile("node", [filePath, config.getManifestPath(), "test", "2017.10.13.21.21"], (error) => {
        assert.deepEqual(config.getManifest(), {rolloutPct: 10, components: [{name: "test",version: "2017.10.13.21.21", url: "https://storage.googleapis.com/install-versions.risevision.com/beta/components/rise-twitter.sh"}]});
        done();
      });

    });
  });

  describe("when all params are present", ()=>{

    beforeEach(()=>{
      platform.writeTextFileSync(config.getManifestPath(), `{"rolloutPct": 10, "components": [{"name": "test", "version": "2017.10.12.04.45", "url":"https://storage.googleapis.com/install-versions.risevision.com/beta/components/rise-twitter.sh"}]}`);
    });
    afterEach(()=>{
      fs.unlinkSync(config.getManifestPath());
    });

    it("updates manifeset", (done)=>{
      execFile("node", [filePath, config.getManifestPath(), "test", "2017.10.13.21.21", 25], (error) => {
        console.log(error);
        assert.deepEqual(config.getManifest(), {rolloutPct: 25, components: [{name: "test",version: "2017.10.13.21.21", url: "https://storage.googleapis.com/install-versions.risevision.com/beta/components/rise-twitter.sh"}]});
        done();
      });

    });

    it("does not update manifest if version doesn't start with 2", (done) => {
      execFile("node", [filePath, config.getManifestPath(), "test", "1.0.1", 25], () => {
        assert.deepEqual(config.getManifest(), {rolloutPct: 10, components: [{name: "test",version: "2017.10.12.04.45", url: "https://storage.googleapis.com/install-versions.risevision.com/beta/components/rise-twitter.sh"}]});
        done();
      });
    });

    it("does not update specific component version if component name doesn't match", (done) => {
      execFile("node", [filePath, config.getManifestPath(), "testabc", "2017.10.13.21.21", 25], () => {
        assert.deepEqual(config.getManifest(), {rolloutPct: 25, components: [{name: "test",version: "2017.10.12.04.45", url: "https://storage.googleapis.com/install-versions.risevision.com/beta/components/rise-twitter.sh"}]});
        done();
      });
    });
  });
});
