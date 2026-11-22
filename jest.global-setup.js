// Pin the time zone to one that has DST, so the date tests behave the same on every machine.
module.exports = async () => {
  process.env.TZ = 'America/New_York';
};
