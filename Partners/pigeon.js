var Template = require('./template.js');
var _ = require('lodash');

var host = process.env['PIGEON_HOST'];
var defaults = {
    "market_name": process.env['PIGEON_MARKET_NAME'],
    "vendor_name": process.env['PIGEON_VENDOR_NAME'],
    "password": process.env['PIGEON_PASSWORD'],
};

module.exports = Template.extend('pigeon', {

    init: function() {
        this._super(host);
    },
    
    order: function(params, cb) {
	var that = this;

	params.map(["invoice_date", "order_time", "service_type"], {
	    "invoice_number" : "invoice",
	    "item_name" : "product_detail",
	    "cod_amount": "cod_collection",
	    "reference_number": "unique_id",
	}, function(inp) {
	    /*
	    if (inp.order_type != "db") {
		inp["payment_type"] = "noncod"; //unclear
		inp["cod_collection"] = 0;
	    }
	    else
		inp["payment_type"] = "cod";
	    */
	    inp["weight"] = "400";
	    if (inp.is_cod)
		inp["payment_type"] = "cod";
	    else {
		inp["payment_type"] = "prepaid"; //unclear
		inp["cod_collection"] = 0;
	    }
	    inp["cod_amount"] = inp["cod_collection"];
	    inp["declared_value"] |= 0;
	    inp_details = _.extend({
		"shipment_details": [inp],
	    }, defaults);
	    return inp_details;
	});
	
	var inp_params = _.clone(params, true);
	var partner_name = "";
    params = _.clone(inp_params, true);
	that.post_req("/ecom-api/v3/place-old-order/", params, function(res, body) {
	    var shipping_label = "";
	    //body.add("success", true);
	    if(body.get().success) {
			params = _.clone(inp_params, true);
			params.out_map({
			    "error" : "err",
			}, function(out) {
			    var data = out.waybills_data;
			    if (data) {
				if (!data[0].success)
				    data[0].err = "Not fetched";
				out = data[0];
				out.msg = partner_name;
				shipping_label = out.shipping_label;
			    }
			    else
				out.success = false;
			    return cb(res,out);
			});
		}
		else {
			return cb(res,body);
		}
	})
    },

    check_serviceable: function(params, cb) {
	var path = '/ecom-api/check-serviceability/';	
	return this.post_req(path, params, cb);
    },

    track: function(params, cb) {
	params.set({"tracking_url" : this.get_tracking_url(params.get().awb_number)});
	return cb(null, params);
    },

    get_tracking_url: function(awb) {
        var url = "http://crm.gopigeon.in/track/unified";
	url += "?awb=" + awb;
	return url
    },

    single_tracking_status: function(params, cb) {
	var url = "http://gopigeon.biz/ecom-api/track/shipments";
	var awb = params.get().awb_number;
	params.map([], {}, function(inp) {
	    return _.extend({
		shipment_details: [inp],
	    }, defaults);
	});

	params.out_map({}, function(out) {
	    out.success = !Boolean(out.error);
	    if (out.results && out.results.constructor == Array && out.results.length > 0) {
		out.details = out.results[0].details.map(function(result) {
		    return _.extend({
			"description": result.desc,
		    }, result);
		});
	    }
	    out.awb = awb;
	    return out;
	});

	return this.post_req(url, params, cb, {url: url});
    },

    cancel: function(params, cb) {
	var url = "/ecom-api/cancel-order";
	params.map([], {}, function(inp) {
	    return _.extend({
		shipment_details: [inp],
	    }, defaults);
	});

	params.out_map({
	    "message": "err",
	}, function(out) {
	    if (!out.data) {
		out.err = out.error;
		out.success = false
	    }
	    else {
		out = out.data[0];
		out.err = out.message;
	    }
	    return out;
	});
	
	return this.post_req(url, params, cb);
    },
});
