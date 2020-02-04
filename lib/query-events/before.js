const beforeEvents = {};
module.exports = () => beforeEvents;
module.exports.addEvent = (name, event) => {
  beforeEvents[name] = event;
};
