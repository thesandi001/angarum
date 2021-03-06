module.exports.Order = require('./Schemas/order_schema.js');
module.exports.Track = require('./Schemas/track_schema.js');
module.exports.Cancel = require('./Schemas/cancel_schema.js');
module.exports.TrackingStatus = require('./Schemas/tracking_status_schema.js');

var partners = {
    'pickrr': require('./Partners/pickrr.js'),
    'pyck': require('./Partners/pyck.js'),
    'pigeon': require('./Partners/pigeon.js'),
    'delhivery': require('./Partners/delhivery.js'),
    'nuvoex': require('./Partners/nuvoex.js'),
    'shadowfax': require('./Partners/shadowfax.js'),
    'xpressbees': require('./Partners/xpressbees.js'),
};

//helper methods

module.exports.Partner = function(partner) {
    if (partner.toLowerCase() in partners)
	return new partners[partner.toLowerCase()]();
    else
	throw Error("Partner: " + partner + " not found");
}
