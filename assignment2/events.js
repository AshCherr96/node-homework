const EventEmitter = require("events");
const emitter = new EventEmitter();

// Listener for the "time" event
emitter.on("time", (message) => {
  console.log("Time received:", message);
});

module.exports = emitter;

// Emit the "time" event every 5 seconds (only when run directly)
if (require.main === module) {
  setInterval(() => {
    const currentTime = new Date().toString();
    emitter.emit("time", currentTime);
  }, 5000);
}