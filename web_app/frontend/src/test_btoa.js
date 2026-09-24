const isStandalone = false;
const currentUid = "some-uid";
const effectiveAccId = "acc-123";
const activeBotTab = "sub1";
const stateObj = { uid: currentUid, acc: effectiveAccId, strat: activeBotTab || "sub1", pwa: isStandalone };
try {
  const stateBase64 = btoa(JSON.stringify(stateObj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  console.log("State:", stateBase64);
} catch (e) {
  console.error("Error:", e);
}
