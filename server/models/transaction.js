'use strict';
const moment = require('moment');
var stripe_key =  require('../../config').stripe_key;
var stripe = require('stripe')(stripe_key);

module.exports = function(Transaction) {
	Transaction.handleStripeWebhookEvent = function(data, cb) {
		//When recording to database, the soundcast id and publisher id come from the 'plan id' data returned from stripe.
		//because the format of 'plan id' is publisherID-soundcastID-soundcast title-billingCycle-price.
		console.log('request body: ', data);

		// let _body = {
		// 	"id": "evt_1BMIZGH62wlr1FFaa0Lymsmi",
		// 	"object": "event",
		// 	"api_version": "2017-04-06",
		// 	"created": 1510243670,
		// 	"data": {
		// 		"object": {
		// 			"id": "in_1BMIZEH62wlr1FFa65J8GKsO",
		// 			"object": "invoice",
		// 			"amount_due": 515,
		// 			"application_fee": null,
		// 			"attempt_count": 0,
		// 			"attempted": true,
		// 			"billing": "charge_automatically",
		// 			"charge": "ch_1BMIZEH62wlr1FFaBxGs2aGd",
		// 			"closed": true,
		// 			"currency": "usd",
		// 			"customer": "cus_Bjm7lqBvULh8VF",
		// 			"date": 1510243668,
		// 			"description": null,
		// 			"discount": null,
		// 			"ending_balance": 0,
		// 			"forgiven": false,
		// 			"lines": {
		// 				"object": "list",
		// 				"data": [
		// 					{
		// 						"id": "sub_Bjm7lDpCIO9S6s",
		// 						"object": "line_item",
		// 						"amount": 515,
		// 						"currency": "usd",
		// 						"description": null,
		// 						"discountable": true,
		// 						"livemode": true,
		// 						"metadata": {},
		// 						"period": {
		// 							"start": 1510243668,
		// 							"end": 1512835668
		// 						},
		// 						"plan": {
		// 							"id": "1503002103690p-1503691618714s-Founders Nextdoor-monthly-5",
		// 							"object": "plan",
		// 							"amount": 515,
		// 							"created": 1510243666,
		// 							"currency": "usd",
		// 							"interval": "month",
		// 							"interval_count": 1,
		// 							"livemode": true,
		// 							"metadata": {},
		// 							"name": "Founders Nextdoor: Monthly subscription",
		// 							"statement_descriptor": null,
		// 							"trial_period_days": null
		// 						},
		// 						"proration": false,
		// 						"quantity": 1,
		// 						"subscription": null,
		// 						"subscription_item": "si_1BMIZEH62wlr1FFabl12IHEK",
		// 						"type": "subscription"
		// 					}
		// 				],
		// 				"has_more": false,
		// 				"total_count": 1,
		// 				"url": "/v1/invoices/in_1BMIZEH62wlr1FFa65J8GKsO/lines"
		// 			},
		// 			"livemode": true,
		// 			"metadata": {},
		// 			"next_payment_attempt": null,
		// 			"number": "efa4702232-0001",
		// 			"paid": true,
		// 			"period_end": 1510243668,
		// 			"period_start": 1510243668,
		// 			"receipt_number": "2743-3745",
		// 			"starting_balance": 0,
		// 			"statement_descriptor": null,
		// 			"subscription": "sub_Bjm7lDpCIO9S6s",
		// 			"subtotal": 515,
		// 			"tax": null,
		// 			"tax_percent": null,
		// 			"total": 515,
		// 			"webhooks_delivered_at": null
		// 		}
		// 	},
		// 	"livemode": true,
		// 	"pending_webhooks": 2,
		// 	"request": "req_ofehLEd21SaMIm",
		// 	"type": "invoice.payment_succeeded"
		// };

		// need to handle only 2 types of events
		switch (data.type) {
			case 'invoice.payment_succeeded':
				const _transactions = [];
				const _transactionsPromises = [];
				const _errors = [];
				data.data.object.lines.data.map((line, i) => {
					const _transactionData = line.plan.id.split('-');

					const _transaction = {
						transactionId: `${data.id}-${i}`,
						invoiceId: data.data.object.id,
						chargeId: data.data.object.charge,
						type: 'charge',
						amount: line.amount / 100,
						date: moment(data.data.object.date * 1000).format('YYYY-MM-DD'),
						publisherId: _transactionData[0],
						soundcastId: _transactionData[1],
						customer: data.data.object.customer, // listener's stripe id
						paymentId: line.plan.id, // id for the payment plan, only present if it's a subscription
						createdAt: moment().utc().format(),
						updatedAt: moment().utc().format(),
					};
					console.log('Try to create transaction: ', _transaction);
					_transactions.push(_transaction);
					_transactionsPromises.push(
						Transaction.create(_transaction)
							.catch(err => {
								_errors.push(_transaction);
								Promise.reject(err);
							})
					);
				});
				Promise.all(_transactionsPromises)
					.then(res => {
						console.log('success create transactions: ', res);
						cb(null, res);
					})
					.catch(err => {
						console.log('ERROR create transactions: ', err);
						// need to delete all created transactions
						_transactions.map(transaction => {
							// TODO: need to find transactions with errors and just remove transactions without errors
							Transaction.find({where: {transactionId: transaction.transactionId}})
								.then(res => {
									if (res.length) {
										const intervalHandler = setInterval(() => {
											Transaction.destroyById(transaction.transactionId, err => {
												if (!err) {
													clearInterval(intervalHandler);
												}
											});
										}, 3600000); // try every hours until success
									}
								});
						});
						cb(err);
					});
				break;
			case 'charge.refunded':
				cb(null, {});
				break;
			default:
				cb(null, {});
		}
	};
	Transaction.remoteMethod(
		'handleStripeWebhookEvent',
		{
			http: {path: '/handleStripeWebhookEvent', verb: 'post', status: 200, errorStatus: 400},
			description: ['handle stripe webhook events'],
			notes: 'it accepts stripe event data',
			accepts: {arg: 'data', type: 'object', http: { source: 'body' }, required: true},
			returns: {type: 'array', root: true}
		}
	);

	Transaction.handleOnetimeCharge = function (data, cb) {
	  if (!req.customer) { //if customer id does not exist yet, create a customer first and then make the charge
	      stripe.customers.create({
	        email: req.receipt_email,
	        source: req.source,
	      })
	      .then(customer => {
	        return stripe.charges.create({
	            amount: req.amount,
	            currency: 'usd',
	            customer: customer.id,
	            description: req.description,
	            statement_descriptor: req.statement_descriptor,
	          }, (err, charge) => {
	            if (err) {
	              console.log(err);
	              return cb(err);
	            }
							const _transaction = {
								transactionId: `tr_${moment().format('x')}`,
								chargeId: charge.id,
								type: 'charge',
								amount: charge.amount / 100,
								date: moment().format('YYYY-MM-DD'),
								publisherId: req.publisherID,
								paymentId: req.planID,
								soundcastId: req.soundcastID,
								customer: customer.id, // listener's stripe id
								createdAt: moment().utc().format(),
								updatedAt: moment().utc().format(),
							};
							Transaction.create(_transaction)
							.then(() => {
								return cb(null, charge);
							})
							.catch(err => {
								return cb(err);
							});
	          });
	      });
	  } else { // if customer id is in the reqest body, create a charge using the existing customer id
	      console.log('customer: ', req.customer);
	        stripe.charges.create({
	          amount: req.amount,
	          currency: 'usd',
	          customer: req.customer,
	          description: req.description,
	          statement_descriptor: req.statement_descriptor,
	        }, (err, charge) => {
	          if (err) {
	            console.log(err);
	            return cb(err);;
	          }
						const _transaction = {
							transactionId: `tr_${moment().format('x')}`,
							chargeId: charge.id,
							type: 'charge',
							amount: charge.amount / 100,
							date: moment().format('YYYY-MM-DD'),
							publisherId: req.publisherID,
							paymentId: req.planID,
							soundcastId: req.soundcastID,
							customer: req.customer, // listener's stripe id
							createdAt: moment().utc().format(),
							updatedAt: moment().utc().format(),
						};
						Transaction.create(_transaction)
						.then(() => {
							return cb(null, charge);
						})
						.catch(err => {
							return cb(err);
						});
	        });
	  }
	};

	Transaction.remoteMethod(
		'handleOnetimeCharge',
		{
			http: {path: '/handleOnetimeCharge', verb: 'post', status: 200, errorStatus: 400},
			description: ['handle one time charges'],
			notes: 'it accepts post request from frontend',
			accepts: {arg: 'req', type: 'object', http: { source: 'body' }, required: true},
			returns: {arg: 'res', type: 'object', http: { source: 'body' }, required: true}
		}
	);
};
