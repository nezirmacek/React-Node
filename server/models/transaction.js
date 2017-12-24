'use strict';
const moment = require('moment');
var stripe_key = require('../../config').stripe_key;
var stripe = require('stripe')(stripe_key);
var admin = require("firebase-admin");
const sendinblue = require('sendinblue-api');
const sendinBlueApiKey = require('../../config').sendinBlueApiKey;

const stripeFeeFixed = 30; // 30 cents fixed fee
const stripeFeePercent = (2.9 + 0.5); // 2.9% transaction fee, 0.5% fee on payout volume
const soundwiseFeePercent = 0;

module.exports = function(Transaction) {
  Transaction.handleStripeWebhookEvent = function(data, cb) {
        // When recording to database, the soundcast id and publisher id come from the 'plan id' data returned from stripe.
        // because the format of 'plan id' is publisherID-soundcastID-soundcast title-billingCycle-price.
    console.log('handleStripeWebhookEvent post request body: ', data);
    const _transactions = [];
    const _transactionsPromises = [];
    const _errors = [];

        // need to handle only 2 types of events
    switch (data.type) {
        case 'invoice.payment_succeeded':

            if (data.data.object.lines.data[0].period.end) {
                const customer = data.data.object.customer;
                const db = admin.database();
                const ref = db.ref('users');
                ref.orderByChild('stripe_id').equalTo(customer)
                  .on('value', snapshot => {
                    let userId;
                    snapshot.forEach(data => {
                      userId = data.key;
                    });
                    db.ref(`users/${userId}/soundcasts`).orderByChild('planID').equalTo(data.data.object.lines.data[0].plan.id)
                      .on('value', snapshot => {
                        let soundcast;
                        snapshot.forEach(data => {
                          soundcast = data.key;
                        });
                        db.ref(`users/${userId}/soundcasts/${soundcast}/current_period_end`)
                          .set(data.data.object.lines.data[0].period.end);
                        console.log('subscription renewed');
                      });
                  });
            }

            data.data.object.lines.data.forEach((line, i) => {
                const _transactionData = line.plan.id.split('-');

                const _transaction = {
                    transactionId: `${data.id}-${i}`,
                    invoiceId: data.data.object.id,
                    chargeId: data.data.object.charge,
                    type: 'charge',
                    amount: line.amount / 100,
                    description: line.description,
                    date: moment(data.data.object.date * 1000).format('YYYY-MM-DD'),
                    publisherId: _transactionData[0],
                    soundcastId: _transactionData[1],
                    customer: data.data.object.customer, // listener's stripe id
                    paymentId: line.plan.id, // id for the subscription plan, only present if it's a subscription
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

            createTransactions(Transaction, _transactionsPromises, _transactions, cb);

            break;
        case 'charge.refunded':
            data.data.object.refunds.data.forEach((refund, i) => {
                Transaction.find({where: {chargeId: refund.charge}})
                    .then(res => {
                        const publisherId = (res.length && res[0].publisherId) || null;
                        const soundcastId = (res.length && res[0].soundcastId) || null;

                        const _transaction = {
                            transactionId: `${data.id}-${i}`,
                            invoiceId: null,
                            chargeId: data.data.object.id,
                            refundId: refund.id,
                            type: 'refund',
                            amount: refund.amount / 100,
                            date: moment(data.data.object.created * 1000).format('YYYY-MM-DD'),
                            publisherId,
                            soundcastId,
                            customer: data.data.object.customer, // listener's stripe id
                            paymentId: refund.id,
                            description: data.data.object.description,
                            refund_date: moment(refund.created * 1000).format('YYYY-MM-DD'),
                            createdAt: moment().utc().format(),
                            updatedAt: moment().utc().format(),
                        };

                        console.log('try to create refund: ', _transaction);
                        _transactions.push(_transaction);
                        _transactionsPromises.push(
                            Transaction.create(_transaction)
                                .catch(err => {
                                    _errors.push(_transaction);
                                    Promise.reject(err);
                                })
                        );
                    })
                    .then(() => {
                        createTransactions(Transaction, _transactionsPromises, _transactions, cb);
                    });
            });

            break;
        case 'invoice.payment_failed':
          const parameters = {'apiKey': sendinBlueApiKey, 'timeout': 5000};
          const sendinObj = new sendinblue(parameters);
          const input = {'to': {['natasha@mysoundwise.com']: 'Natasha Che'},
            'from': ['support@mysoundwise.com', 'Soundwise'],
            'subject': `Payment failed for invoice #${data.data.object.id}`,
            'html': `<p>Webhook notice from Stripe:</p>
              <div>${JSON.stringify(data)}</div>`,
          };

          sendinObj.send_email(input, function(err, response) {
            if (err) {
              console.log('email admin error: ', err);
              return cb(null, {});
            } else {
              // console.log('email sent to: ', invitee);
              return cb(null, {});
            }
          });
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
            accepts: {arg: 'data', type: 'object', http: {source: 'body'}, required: true},
            returns: {type: 'array', root: true}
        }
  );

  Transaction.handleOnetimeCharge = function(req, cb) {
        if (!req.customer) { //if customer id does not exist yet, create a customer first and then make the charge
            stripe.customers.create({
                email: req.receipt_email,
                source: req.source,
            })
                .then(customer => {
                    const data = Object.assign({}, req, {platformCustomer: customer.id});
                    return createCharge(Transaction, data, cb);
                });
        } else { // if customer id is in the reqest body, create a charge using the existing customer id
            console.log('customer: ', req.customer);
            createCharge(Transaction, req, cb);
        }
  };

  Transaction.remoteMethod(
        'handleOnetimeCharge',
        {
            http: {path: '/handleOnetimeCharge', verb: 'post', status: 200, errorStatus: 400},
            description: ['handle one time charges'],
            notes: 'it accepts post request from frontend',
            accepts: {arg: 'req', type: 'object', http: {source: 'body'}, required: true},
            returns: {arg: 'res', type: 'object', http: {source: 'body'}, required: true}
        }
  );
};

function createTransactions(Transaction, transactionsPromises,
 transactions, cb) {
  Promise.all(transactionsPromises)
    .then(res => {
        console.log('success create transactions: ', res);
        cb(null, res);
    })
    .catch(err => {
        console.log('ERROR create transactions: ', err);
        // need to delete all created transactions
        transactions.map(transaction => {
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
}

function createCharge(Transaction, data, cb) {
  const {
    amount,
    platformCustomer,
    description,
    publisherID,
    planID,
    soundcastID,
    stripe_user_id,
  } = data;

  let statement_descriptor;
  if (data.statement_descriptor.length > 18) {
    statement_descriptor = data.statement_descriptor.slice(0, 18) + '...';
  } else {
    statement_descriptor = data.statement_descriptor;
  }

  const fees = soundwiseFeePercent / 100 * Number(amount);
  // create token from customer
  // and then create charge using token and connected account id
  stripe.tokens.create({
    customer: platformCustomer,
  }, {
    stripe_account: stripe_user_id,
  }).then(function(token) {
    stripe.charges.create({
      amount: Number(amount).toFixed(),
      currency: 'usd',
      source: token.id,
      application_fee: fees.toFixed(),
      description,
      statement_descriptor,
    }, {
      stripe_account: stripe_user_id,
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
        date: moment(charge.created * 1000).format('YYYY-MM-DD'),
        publisherId: publisherID,
        paymentId: planID,
        soundcastId: soundcastID,
        description,
        customer: platformCustomer, // listener's stripe id, this is the customer on platform, not on the connected account
        createdAt: moment().utc().format(),
        updatedAt: moment().utc().format(),
      };

      Transaction.create(_transaction)
        .then(() => {
          return cb(null, Object.assign({}, charge, {platformCustomer}));
        })
        .catch(err => {
          return cb(err);
        });
    });
  });
}
