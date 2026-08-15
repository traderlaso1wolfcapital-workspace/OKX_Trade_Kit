fetch("https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT-SWAP", { method: "OPTIONS" })
  .then(res => {
    console.log("CORS Headers:", res.headers.get("access-control-allow-origin"));
  })
  .catch(e => console.error(e));
