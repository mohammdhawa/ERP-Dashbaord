import test from "node:test";
import assert from "node:assert/strict";
import { deviceName } from "./deviceName.js";

const UA = {
  chromeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  edgeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
  firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  safariIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  operaWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/114.0.0.0",
};

test("a session is named browser · operating system", () => {
  assert.equal(deviceName(UA.chromeWindows), "Chrome · Windows");
  assert.equal(deviceName(UA.firefoxLinux), "Firefox · Linux");
  assert.equal(deviceName(UA.safariMac), "Safari · macOS");
});

test("browsers that also say Chrome are named for what they are", () => {
  assert.equal(deviceName(UA.edgeWindows), "Edge · Windows");
  assert.equal(deviceName(UA.operaWindows), "Opera · Windows");
});

test("phones are named for their own OS, not the Linux or macOS in their UA", () => {
  assert.equal(deviceName(UA.chromeAndroid), "Chrome · Android");
  assert.equal(deviceName(UA.safariIphone), "Safari · iOS");
});

test("an unrecognised half is left out rather than guessed", () => {
  assert.equal(deviceName("Mozilla/5.0 (Windows NT 10.0) SomeNewBrowser/1.0"), "Windows");
  assert.equal(deviceName("curl/8.4.0"), null);
  assert.equal(deviceName(""), null);
  assert.equal(deviceName(undefined), null);
});
