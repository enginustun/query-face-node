const afterEvents = {};
module.exports = () => afterEvents;
module.exports.addEvent = (name, event) => {
  afterEvents[name] = event;
};
