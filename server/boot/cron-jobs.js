/**
 * Created by developer on 09.11.17.
 */
'use strict';
var schedule = require('node-schedule');
var moment = require('moment');
var firebase = require('firebase');
var paypal = require('paypal-rest-sdk');

var config = require('../../config').config;
var paypalConfig = require('../../config').paypalConfig;

module.exports = function(app) {
	// init firebase
	firebase.initializeApp(config);
	paypal.configure(paypalConfig);
	
	var j = schedule.scheduleJob('10 * * * * *', function () { // TODO: need to set up schedule
		// need to pay money for every publisher for all transactions for the last month (-15 days os delay)
		const Transaction = app.models.Transaction;
		const Payout = app.models.Payout;
		
		// for paypal
		const sender_batch_id = Math.random().toString(36).substring(9);
		const payoutsObj = {
			sender_batch_header: {
				sender_batch_id: sender_batch_id,
				email_subject: 'You have a payment',
			},
			items: [],
		};
		
		// for our database
		const _payouts = [];
		
		firebase.database().ref('publishers').once('value')
			.then(publishersSnapshot => {
				if (publishersSnapshot.val()) {
					const _publishersObj = publishersSnapshot.val();
					const _publisherPromises = [];
					
					for (let publisherId in _publishersObj) {
						if (_publishersObj.hasOwnProperty(publisherId)) {
							const _publisher = _publishersObj[publisherId];
							_publisherPromises.push(
								// first find charges
								Transaction.find({
									where: {
										publisherId,
										date: {
											between: [
												moment().utc().subtract(15, 'days').subtract(1, 'months').format('YYYY-MM-DD'),
												moment().utc().subtract(15, 'days').format('YYYY-MM-DD')
											]
										},
										type: 'charge'
									}
								})
									.then(transactions => {
										if (transactions.length) {
											let _payoutAmount = 0;
											transactions.map(transaction => {
												_payoutAmount += +transaction.amount;
											});
											
											payoutsObj.items.push({
												recipient_type: 'EMAIL',
												amount: {
													value: _payoutAmount,
													currency: 'USD'
												},
												receiver: _publisher.paypalEmail || 'dd.yakovenko@gmail.com', // TODO: check field name, remove hardcoded value
												note: 'Thank you.',
												sender_item_id: publisherId
											});
											
											_payouts.push({
												batchId: sender_batch_id, //id for the payout batch from paypal that this particular payout belongs to
												amount: _payoutAmount,
												date: moment().utc().format('YYYY-MM-DD'),
												publisherId,
												email: _publisher.paypalEmail, //email address used to send paypal payout // TODO: check field name
												// payoutId: { type: Sequelize.STRING }, // id for the payout item returned by paypal's webhook event
											});
										}
										return null;
									})
							);
						}
					}
					
					// when all payout are generated, send them with paypal
					Promise.all(_publisherPromises)
						.then(res => {
							paypal.payout.create(payoutsObj, function (error, payout) {
								if (error) {
									console.log(error.response);
									throw error;
								} else {
									console.log("Create Payout Response");
									console.log(payout);
									const _payoutsPromises = [];
									
									_payouts.map(_payout => {
										_payout.batchId = payout.batchId; // TODO: find batchId in payout
										_payout.payoutId = payout.payoutId; // TODO: find batchId in payout
										_payout.createdAt = moment().utc().format();
										_payout.updatedAt = moment().utc().format();
										
										_payoutsPromises.push(Payout.create(_payout));
									});
									
									Promise.all(_payoutsPromises)
										.then(res => console.log('success create payouts: ', res))
										.catch(err => {
											console.log('ERROR create payouts: ', err);
										})
								}
							});
						})
						.catch(err => console.log('ERROR payout is canceled: ', err));
					
					
				}
			})
			.catch(err => {
				console.log('ERROR get publishers for payouts: ', err);
			})
	});
};