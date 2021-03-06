var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");

var host = process.env['DELHIVERY_HOST'];
var return_details = {
/*    "client": "Elanic",
    "return_add": "",
    "return_city": "",
    "return_country": "",
    "return_name": "",
    "return_phone": "",
    "return_pin": "",
    "return_state": "", */
};

var defaults={
    format: "json",
    output: "json",
    token: process.env["DELHIVERY_TOKEN"],
};

// Declare partner specific variables here.
// Check out other partners for more information.

module.exports = Template.extend('Delhivery', {

    init: function() {
	this._super(host);
    },
    
    order: function(params, cb) {
	var url = "/cmu/push/json/?" + querystring.stringify(_.pick(defaults, ["token"]));


	
	// Check out Order schema file for more information.
	params.map([], {
	    "from_address" : "from_add",
	    "to_address" : "to_add",
	    "from_mobile_number": "from_phone",
	    "to_mobile_number": "to_phone",
	    "from_pin_code": "from_pin",
	    "to_pin_code": "to_pin",
	    "reference_number": "waybill",
	    "to_mobile_number": "to_phone",
	    "order_time": "order_date",
	    "invoice_number": "order",
	    "declared_Value": "total_amount",
	    "item_name": "product_desc",
	}, function(inp) {
	    var ship = _.extend(_.pick(inp, ["waybill", "to_name", "order", "product_desc", "order_date", "total_amount", "cod_amount", "to_add", "to_city", "to_state", "to_country", "to_phone", "to_pin", "weight", "quantity"]), return_details);
	    var pickup = _.pick(inp, ["from_add", "from_city", "from_country", "from_name", "from_phone", "from_pin"]);
	    for (item in ship) {
		if (item.indexOf("to_") == 0) {
		    ship[item.slice(3)] = ship[item];
		    delete ship[item];
		}
	    }	    
	    for (item in pickup) {
		if (item.indexOf("from_") == 0) {
		    pickup[item.slice(5)] = pickup[item];
		    delete pickup[item];
		}
	    }
	    if (inp.order_type.indexOf("pickup") > 0) {
		ship.package_type = "pickup";
		ship.cod_amount = 0;
	    }
	    else {
		ship.package_type = "pre-paid";
		if (inp.is_cod)
		    ship.package_type = "cod";
		else
		    ship.cod_amount = 0;
	    }
	    ship.payment_mode = ship.package_type;
	    pickup.name = "ELANIC";
	    return _.extend({
		"data": JSON.stringify({
		    "pickup_location": pickup,
		    "shipments": [ship],
		})
	    }, defaults);
	});

	
	params.out_map({
	    "error": "err",
	}, function(out) {
	    if (out && out.constructor == String)
		out = JSON.parse(out);
	    if (out.packages && out.packages.length > 0)
		out.awb = out.packages[0].waybill;
	    if (out.success) {
		out.err = null;
	    }
	    else {
		out.success = false;
		out.err = out.rmk;
	    }
	    return out;
	});

	return this.post_req(url, params, cb, {json: null, body: null, form: params.get()});
    },

    track: function(params, cb) {
	params.set({ "tracking_url": this.get_tracking_url(params.get().awb_number)});
	return cb(null, params);
    },

    get_tracking_url: function(awb) {
	return "https://track.delhivery.com/p/" + awb;
    },

    single_tracking_status: function(params, cb) {
	var url = "https://track.delhivery.com/api/status/packages/json/?waybill="+params.get().awb_number;
	var awb = params.get().awb_number;
	params.out_map({
	    "err": "error",
	}, function(out) {
	    if (String == out.constructor)
		out = JSON.parse(out);
	    
	    out.success = Boolean(out.ShipmentData);
	    if (out.ShipmentData && out.ShipmentData.constructor == Array && out.ShipmentData.length > 0) {
		var details = out.ShipmentData[0].Shipment.Scans.map(function(scan) {
		    scan = scan.ScanDetail;
		    return {
			"time": scan.ScanDateTime,
			"status": scan.Scan,
			"location": scan.ScannedLocation,
			"description": scan.Instructions,
		    };
		});
		out.details = details;
	    }
	    out.awb = awb;
	    return out;
	});

	return this.get_req(url, params, cb, {url: url})
    },

    cancel: function(params, cb) {
	params.set({success: false, err: "Error link not available"});
	return cb(null, params); //unclear
	var url = "/api/p/edit/";
	params.map([], {
	    "awb" : "waybill",
	}, function(inp) {
	    inp.cancellation = true;
	    return _.extend(inp, defaults);
	});

	params.out_map({
	    "error": "err",
	}, function(out) {
	    out.success = (out.success == "True");
	    return out;
	});
	
	return this.post_req(url, params, cb, {headers: {"Authorization": "Token " + defaults.token}});
    },

});
